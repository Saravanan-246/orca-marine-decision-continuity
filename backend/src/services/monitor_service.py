from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from src.core.database import db
from src.engines.dependency_engine import (
    Evaluation,
    evaluate_dependency,
    transition_allowed,
)
from src.models.commitment import CommitmentState, MarineCommitment
from src.models.evidence import Evidence
from src.models.event import InternalEvent
from src.realtime.manager import event_manager
from src.services.dependency_service import (
    apply_dependency_evaluations,
    derive_commitment_state,
    evaluate_commitment_dependencies,
)
from src.services.impact_analysis_service import (
    analyze_commitment_impact,
)
from src.services.segment_isolation_service import (
    isolate_commitment_segments,
)


ACTIVE_STATES = {
    CommitmentState.DRAFT,
    CommitmentState.VALID,
    CommitmentState.AT_RISK,
    CommitmentState.UNVERIFIABLE,
    CommitmentState.REPAIRED,
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _save(commitment: MarineCommitment) -> None:
    from src.services.repository_helpers import replace_one

    replace_one(
        db.collection("commitments"),
        {"commitment_id": commitment.commitment_id},
        {
            "_id": commitment.commitment_id,
            **commitment.model_dump(mode="json"),
        },
    )


def _load_active() -> list[MarineCommitment]:
    active_values = {
        state.value
        for state in ACTIVE_STATES
    }

    loaded: list[MarineCommitment] = []
    for item in db.collection("commitments").find({}):
        if item.get("state") not in active_values:
            continue
        payload = {
            key: value
            for key, value in item.items()
            if key != "_id"
        }
        try:
            loaded.append(MarineCommitment.model_validate(payload))
        except ValidationError:
            continue
    return loaded


def _parse_evidence(item: Any) -> Evidence:
    if isinstance(item, Evidence):
        return item

    return Evidence.model_validate(item)


def _split_monitor_payload(
    provider: dict[str, Any] | list[Any] | None,
) -> tuple[dict[str, Any] | None, list[Evidence] | None]:
    if provider is None:
        return {}, None

    if isinstance(provider, list):
        return None, [
            _parse_evidence(item)
            for item in provider
        ]

    if not isinstance(provider, dict):
        raise TypeError(
            "monitor payload must be a dict or evidence list"
        )

    raw_evidence = provider.get("evidence")
    if isinstance(raw_evidence, list):
        return None, [
            _parse_evidence(item)
            for item in raw_evidence
        ]

    if provider.get("use_latest_marine_state") is True:
        from src.services.marine_evidence import (
            evidence_from_latest_marine_state,
        )

        return None, evidence_from_latest_marine_state()

    return provider, None


def _serialize_status(value: Any) -> Any:
    return value.value if hasattr(value, "value") else value


def _record_evaluations(
    commitment: MarineCommitment,
    evaluations: list[Evaluation],
) -> None:
    apply_dependency_evaluations(commitment, evaluations)

    by_id = {
        item.dependency_id: item
        for item in evaluations
        if item.dependency_id
    }

    for dependency in commitment.dependencies:
        item = by_id.get(dependency.dependency_id)
        if item is None:
            continue

        dependency.current_value = item.current_value

        if item.observed_at is not None:
            dependency.observed_at = item.observed_at


def reevaluate_commitment(
    commitment_id: str,
    provider: dict[str, Any] | list[Any] | None = None,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> dict:
    from src.services.commitment_service import get_commitment

    commitment = get_commitment(commitment_id)
    observed_at = as_of or _now()

    if evidence is not None:
        evidence_items = evidence
        provider_map: dict[str, Any] | None = None
    else:
        provider_map, evidence_items = _split_monitor_payload(
            provider
        )

    if evidence_items is not None:
        evaluations = evaluate_commitment_dependencies(
            commitment,
            evidence=evidence_items,
            as_of=observed_at,
        )
    else:
        values = provider_map or {}
        evaluations = [
            evaluate_dependency(
                dependency,
                values.get(dependency.parameter),
            )
            for dependency in commitment.dependencies
        ]

    results: list[dict] = []
    dependency_changes: list[dict] = []

    for dependency, result in zip(
        commitment.dependencies,
        evaluations,
        strict=True,
    ):
        previous = (
            dependency.current_value
            if dependency.current_value is not None
            else dependency.value_at_commit
        )
        previous_status = dependency.status
        current = result.current_value

        changed = (
            previous != current
            or previous_status != result.status
        )

        result_item = {
            "dependency_id": dependency.dependency_id,
            "previous_value": previous,
            "current_value": current,
            "previous_status": previous_status,
            "status": result.status,
            "affected_segments": result.affected_segments,
            "reason": result.reason,
            "timestamp": observed_at,
            "source": result.source or dependency.source,
            "observed_at": result.observed_at,
            "evidence_id": result.evidence_id,
            "data_status": result.data_status,
            "freshness_hours": result.freshness_hours,
        }

        results.append(result_item)

        if changed:
            dependency_changes.append(result_item)

    isolation = isolate_commitment_segments(
        commitment,
        evaluations,
    )
    impact = analyze_commitment_impact(
        commitment,
        evaluations,
    )

    target = derive_commitment_state(
        [item.status for item in evaluations]
    )

    previous_state = commitment.state

    if target != previous_state:
        if not transition_allowed(
            previous_state.value,
            target.value,
        ):
            target = previous_state

    changed_commitment = (
        target != previous_state
        or bool(dependency_changes)
    )

    if changed_commitment:
        _record_evaluations(commitment, evaluations)

        now = observed_at
        commitment.state = target
        commitment.version += 1
        commitment.updated_at = now
        commitment.last_updated_at = now

        _save(commitment)

    for change in dependency_changes:
        event_manager.publish(
            InternalEvent(
                event_id=(
                    f"EV-{commitment.commitment_id}-"
                    f"{change['dependency_id']}-"
                    f"{commitment.version}"
                ),
                event_type="DEPENDENCY_CHANGED",
                entity_id=commitment.commitment_id,
                version=commitment.version,
                timestamp=change["timestamp"],
                payload={
                    "commitment_id": commitment.commitment_id,
                    "dependency_id": change["dependency_id"],
                    "previous_value": change["previous_value"],
                    "current_value": change["current_value"],
                    "previous_status": _serialize_status(
                        change["previous_status"]
                    ),
                    "status": _serialize_status(
                        change["status"]
                    ),
                    "affected_segments": change[
                        "affected_segments"
                    ],
                    "source": change["source"],
                    "evidence_id": change["evidence_id"],
                },
            )
        )

    if changed_commitment:
        event_manager.publish(
            InternalEvent(
                event_id=(
                    f"EV-{commitment.commitment_id}-"
                    f"{commitment.version}"
                ),
                event_type="COMMITMENT_UPDATED",
                entity_id=commitment.commitment_id,
                version=commitment.version,
                timestamp=commitment.updated_at,
                payload={
                    "previous_state": previous_state.value,
                    "state": commitment.state.value,
                    "changed_dependencies": [
                        item["dependency_id"]
                        for item in dependency_changes
                    ],
                },
            )
        )

    return {
        "commitment_id": commitment_id,
        "previous_state": previous_state,
        "state": commitment.state,
        "results": results,
        "segment_isolation": isolation.as_dict(),
        "impact_analysis": impact.as_dict(),
    }


def reevaluate_all(
    provider: dict[str, Any] | list[Any] | None = None,
    limit: int = 50,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> list[dict]:
    safe_limit = min(
        max(limit, 1),
        200,
    )

    active = _load_active()

    return [
        reevaluate_commitment(
            item.commitment_id,
            provider,
            evidence=evidence,
            as_of=as_of,
        )
        for item in active[:safe_limit]
    ]


def dependency_list(
    commitment_id: str,
) -> list:
    from src.services.commitment_service import get_commitment

    return get_commitment(commitment_id).dependencies
