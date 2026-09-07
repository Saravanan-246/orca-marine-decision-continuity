from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from src.core.database import db
from src.engines.dependency_engine import Evaluation, transition_allowed
from src.engines.repair_engine import (
    RepairCandidateSet,
    RepairRanking,
    generate_repair,
    generate_repair_candidates,
    rank_repair_candidates,
)
from src.models.commitment import CommitmentState, MarineCommitment
from src.models.event import InternalEvent
from src.models.evidence import Evidence
from src.models.repair import RepairOption, RepairProposal, RepairStatus
from src.realtime.manager import event_manager
from src.services.commitment_service import get_commitment
from src.services.repository_helpers import replace_one


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _document(proposal: RepairProposal) -> dict[str, Any]:
    data = proposal.model_dump(mode="json")
    data["_id"] = proposal.repair_id
    return data


def _save_repair(proposal: RepairProposal) -> None:
    """
    Persist one repair proposal.

    Compatible with:
    - PyMongo collections
    - the project's in-memory MemoryCollection

    Never relies on unsupported compound query operators in the
    in-memory repository.
    """
    collection = db.collection("repairs")
    document = _document(proposal)

    existing = collection.find_one(
        {"_id": proposal.repair_id}
    )

    if existing is not None:
        replace_one(
            collection,
            {"_id": proposal.repair_id},
            document,
        )
        return

    existing = collection.find_one(
        {"repair_id": proposal.repair_id}
    )

    if existing is not None:
        replace_one(
            collection,
            {"repair_id": proposal.repair_id},
            document,
        )
        return

    collection.insert_one(document)


def propose(
    commitment: MarineCommitment,
    dependency_id: str,
    current_value: object,
    affected_segments: list[str],
) -> RepairProposal:
    """
    Generate and persist a repair proposal for a violated commitment.
    """
    if commitment.state != CommitmentState.VIOLATED:
        raise ValueError(
            "repair proposal requires a violated commitment"
        )

    dependency = next(
        (
            item
            for item in commitment.dependencies
            if item.dependency_id == dependency_id
        ),
        None,
    )

    if dependency is None:
        raise ValueError(
            "dependency not found"
        )

    if not affected_segments:
        raise ValueError(
            "affected_segments must not be empty"
        )

    # De-duplicate while preserving order.
    affected_segments = list(
        dict.fromkeys(affected_segments)
    )

    valid_segment_ids = {
        segment.segment_id
        for segment in commitment.segments
    }

    invalid_segments = (
        set(affected_segments)
        - valid_segment_ids
    )

    if invalid_segments:
        raise ValueError(
            "unknown affected segment(s): "
            + ", ".join(sorted(invalid_segments))
        )

    proposal = generate_repair(
        commitment,
        dependency,
        current_value,
        affected_segments,
    )

    if not proposal.options:
        raise ValueError(
            "repair engine returned no repair options"
        )

    if set(proposal.affected_segments) != set(
        affected_segments
    ):
        raise ValueError(
            "repair engine returned inconsistent affected segments"
        )

    _save_repair(proposal)

    event_manager.publish(
        InternalEvent(
            event_id=(
                f"EV-{proposal.repair_id}-PROPOSED"
            ),
            event_type="REPAIR_PROPOSED",
            entity_id=proposal.commitment_id,
            version=proposal.version,
            timestamp=proposal.created_at,
            payload={
                "repair_id": proposal.repair_id,
                "dependency_id": (
                    proposal.violated_dependency_id
                ),
                "affected_segments": (
                    proposal.affected_segments
                ),
                "preserved_segments": (
                    proposal.preserved_segments
                ),
                "selected_option": (
                    proposal.selected_option
                ),
                "disruption_score": (
                    proposal.disruption_score
                ),
                "requires_human_approval": (
                    proposal.requires_human_approval
                ),
            },
        )
    )

    return proposal


def generate_candidates(
    commitment: MarineCommitment,
    *,
    evaluations: list[Evaluation] | None = None,
    extra_options: list[RepairOption] | None = None,
) -> RepairCandidateSet:
    """
    Generate unapplied repair candidates from isolation/impact.

    Does not persist, approve, or mutate the commitment.
    """
    from src.services.impact_analysis_service import (
        analyze_commitment_impact,
    )

    impact = analyze_commitment_impact(
        commitment,
        evaluations,
    )
    isolation = impact.isolation

    return generate_repair_candidates(
        commitment,
        list(isolation.affected_segment_ids),
        triggering_dependency_ids=list(
            isolation.triggering_dependency_ids
        ),
        extra_options=extra_options,
    )


def rank_candidates(
    candidate_set: RepairCandidateSet,
) -> RepairRanking:
    """
    Rank accepted candidates by minimum disruption.

    Does not persist, approve, or mutate a commitment.
    """
    return rank_repair_candidates(candidate_set)


def propose_ranked(
    commitment: MarineCommitment,
    ranking: RepairRanking,
    *,
    triggering_dependency_id: str = "RANKED",
) -> RepairProposal:
    """
    Persist a ranked repair as a human-approval proposal.

    Does not apply the repair or mutate the commitment.
    """
    selected = ranking.selected
    if selected is None:
        raise ValueError(
            "no ranked repair candidate to propose"
        )

    if commitment.state != CommitmentState.VIOLATED:
        raise ValueError(
            "repair proposal requires a violated commitment"
        )

    if ranking.commitment_id != commitment.commitment_id:
        raise ValueError(
            "ranking does not belong to this commitment"
        )

    options = [
        RepairOption(
            option_id=item.option_id,
            repair_type=item.repair_type,
            affected_segments=list(item.affected_segments),
            changes=dict(item.changes),
            disruption_score=item.disruption_score,
            reason=item.reason,
        )
        for item in ranking.ranked
    ]

    if not options:
        raise ValueError(
            "ranked repair has no valid options"
        )

    proposal = RepairProposal(
        repair_id=(
            f"RP-{commitment.commitment_id}-"
            f"{selected.option_id}"
        ),
        commitment_id=commitment.commitment_id,
        violated_dependency_id=triggering_dependency_id,
        affected_segments=list(ranking.affected_segment_ids),
        preserved_segments=list(
            ranking.unaffected_segment_ids
        ),
        options=options,
        selected_option=selected.option_id,
        disruption_score=selected.disruption_score,
        reason=(
            f"Selected {selected.repair_type} "
            f"({selected.option_id}) as the minimum-"
            f"disruption candidate pending human approval."
        ),
        requires_human_approval=True,
        status=RepairStatus.PROPOSED,
    )

    _save_repair(proposal)

    event_manager.publish(
        InternalEvent(
            event_id=f"EV-{proposal.repair_id}-PROPOSED",
            event_type="REPAIR_PROPOSED",
            entity_id=proposal.commitment_id,
            version=proposal.version,
            timestamp=proposal.created_at,
            payload={
                "repair_id": proposal.repair_id,
                "dependency_id": proposal.violated_dependency_id,
                "affected_segments": proposal.affected_segments,
                "preserved_segments": proposal.preserved_segments,
                "selected_option": proposal.selected_option,
                "disruption_score": proposal.disruption_score,
                "requires_human_approval": (
                    proposal.requires_human_approval
                ),
            },
        )
    )

    return proposal


def get_repair(
    repair_id: str,
) -> RepairProposal:
    collection = db.collection("repairs")

    item = collection.find_one(
        {"_id": repair_id}
    )

    if item is None:
        item = collection.find_one(
            {"repair_id": repair_id}
        )

    if item is None:
        raise ValueError(
            f"repair not found: {repair_id}"
        )

    item.pop("_id", None)

    return RepairProposal.model_validate(item)


def list_repairs(
    commitment_id: str,
) -> list[RepairProposal]:
    items = db.collection("repairs").find(
        {"commitment_id": commitment_id}
    )

    return [
        RepairProposal.model_validate(
            {
                key: value
                for key, value in item.items()
                if key != "_id"
            }
        )
        for item in items
    ]


def _apply_time_shift(
    commitment: MarineCommitment,
    affected_segments: set[str],
    shift_hours: float,
) -> None:
    if shift_hours <= 0:
        raise ValueError(
            "shift_hours must be greater than zero"
        )

    shift = timedelta(hours=shift_hours)

    for segment in commitment.segments:
        if segment.segment_id not in affected_segments:
            continue

        segment.start_time += shift
        segment.end_time += shift


def _apply_route_shift(
    commitment: MarineCommitment,
    affected_segments: set[str],
    route: object,
) -> None:
    if not isinstance(route, str) or not route.strip():
        raise ValueError(
            "repair route is invalid"
        )

    normalized_route = route.strip()

    for segment in commitment.segments:
        if segment.segment_id not in affected_segments:
            continue

        segment.required_conditions["_repair"] = {
            "route_shifted": 1.0,
            "route": normalized_route,
        }


def _apply_selected_repair(
    commitment: MarineCommitment,
    proposal: RepairProposal,
) -> None:
    selected = next(
        (
            option
            for option in proposal.options
            if option.option_id == proposal.selected_option
        ),
        None,
    )

    if selected is None:
        raise ValueError(
            "selected repair option not found"
        )

    affected = set(
        proposal.affected_segments
    )

    if not affected:
        raise ValueError(
            "repair has no affected segments"
        )

    if selected.repair_type == "TIME_SHIFT":
        shift_hours = selected.changes.get(
            "shift_hours"
        )

        if not isinstance(
            shift_hours,
            (int, float),
        ):
            raise ValueError(
                "invalid time shift"
            )

        _apply_time_shift(
            commitment,
            affected,
            float(shift_hours),
        )
        return

    if selected.repair_type == "ROUTE_SHIFT":
        _apply_route_shift(
            commitment,
            affected,
            selected.changes.get("route"),
        )
        return

    raise ValueError(
        f"unsupported repair type: "
        f"{selected.repair_type}"
    )


def _save_commitment(
    commitment: MarineCommitment,
) -> None:
    now = _now()

    commitment.version += 1
    commitment.updated_at = now
    commitment.last_updated_at = now

    updated = replace_one(
        db.collection("commitments"),
        {
            "commitment_id": commitment.commitment_id,
        },
        {
            "_id": commitment.commitment_id,
            **commitment.model_dump(mode="json"),
        },
    )

    if not updated:
        raise ValueError(
            f"commitment not found during update: "
            f"{commitment.commitment_id}"
        )


def _publish_repair_event(
    proposal: RepairProposal,
    event_type: str,
) -> None:
    event_manager.publish(
        InternalEvent(
            event_id=(
                f"EV-{proposal.repair_id}-"
                f"{event_type}-"
                f"{proposal.version}"
            ),
            event_type=event_type,
            entity_id=proposal.commitment_id,
            version=proposal.version,
            timestamp=proposal.updated_at,
            payload={
                "repair_id": proposal.repair_id,
                "dependency_id": (
                    proposal.violated_dependency_id
                ),
                "status": proposal.status.value,
                "affected_segments": (
                    proposal.affected_segments
                ),
                "preserved_segments": (
                    proposal.preserved_segments
                ),
                "selected_option": (
                    proposal.selected_option
                ),
                "disruption_score": (
                    proposal.disruption_score
                ),
                "commitment_state": (
                    CommitmentState.REPAIRED.value
                    if proposal.status
                    == RepairStatus.APPROVED
                    else None
                ),
            },
        )
    )


def _validate_proposal_for_apply(
    commitment: MarineCommitment,
    proposal: RepairProposal,
) -> RepairOption:
    if not proposal.requires_human_approval:
        raise ValueError(
            "repair proposal approval configuration is invalid"
        )

    if not proposal.selected_option:
        raise ValueError(
            "invalid repair: no selected option"
        )

    selected = next(
        (
            option
            for option in proposal.options
            if option.option_id == proposal.selected_option
        ),
        None,
    )

    if selected is None:
        raise ValueError(
            "invalid repair: selected option not found"
        )

    preserved = set(proposal.preserved_segments)
    leaked = set(selected.affected_segments) & preserved
    if leaked:
        raise ValueError(
            "invalid repair: would change unaffected segment(s): "
            + ", ".join(sorted(leaked))
        )

    allowed = set(proposal.affected_segments)
    extra = set(selected.affected_segments) - allowed
    if extra:
        raise ValueError(
            "invalid repair: option targets non-isolated segment(s): "
            + ", ".join(sorted(extra))
        )

    if commitment.state != CommitmentState.VIOLATED:
        raise ValueError(
            "repair approval requires a violated commitment"
        )

    if not transition_allowed(
        commitment.state.value,
        CommitmentState.REPAIRED.value,
    ):
        raise ValueError(
            "commitment cannot transition to REPAIRED"
        )

    return selected


def _approve_and_apply(
    proposal: RepairProposal,
) -> None:
    from fastapi import HTTPException

    try:
        commitment = get_commitment(proposal.commitment_id)
    except HTTPException as exc:
        if exc.status_code == 404:
            raise ValueError(
                f"commitment not found: {proposal.commitment_id}"
            ) from exc
        raise

    _validate_proposal_for_apply(commitment, proposal)

    preserved_snapshot = {
        segment.segment_id: segment.model_dump()
        for segment in commitment.segments
        if segment.segment_id in set(proposal.preserved_segments)
    }

    _apply_selected_repair(commitment, proposal)

    for segment in commitment.segments:
        snapshot = preserved_snapshot.get(segment.segment_id)
        if snapshot is not None and segment.model_dump() != snapshot:
            raise ValueError(
                "unaffected segments were changed"
            )

    commitment.state = CommitmentState.REPAIRED
    _save_commitment(commitment)


def _remonitor_after_repair(
    commitment_id: str,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> dict:
    from src.services.monitor_service import reevaluate_commitment

    items = evidence
    if items is None:
        stored = get_commitment(commitment_id)
        items = stored.evidence

    return reevaluate_commitment(
        commitment_id,
        evidence=list(items),
        as_of=as_of,
    )


def set_status(
    repair_id: str,
    status: RepairStatus,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> RepairProposal:
    """
    Transition a repair proposal through the human approval gate.

    PROPOSED -> APPROVED
        Applies the selected repair only after validation,
        then re-monitors the updated commitment with evidence.

    PROPOSED -> REJECTED
        Records rejection without modifying the commitment
        and without re-monitoring.

    Repeated approval of an already APPROVED repair is a no-op
    and does not apply the repair again.
    """
    proposal = get_repair(repair_id)

    if proposal.status == status:
        return proposal

    if proposal.status != RepairStatus.PROPOSED:
        raise ValueError(
            f"repair cannot transition from "
            f"{proposal.status.value} to {status.value}"
        )

    if status == RepairStatus.APPROVED:
        _approve_and_apply(proposal)
        _remonitor_after_repair(
            proposal.commitment_id,
            evidence=evidence,
            as_of=as_of,
        )
    elif status == RepairStatus.REJECTED:
        pass
    else:
        raise ValueError(
            f"unsupported repair status: {status.value}"
        )

    proposal.status = status
    proposal.version += 1
    proposal.updated_at = _now()

    _save_repair(proposal)

    _publish_repair_event(
        proposal,
        (
            "REPAIR_APPROVED"
            if status == RepairStatus.APPROVED
            else "REPAIR_REJECTED"
        ),
    )

    return proposal