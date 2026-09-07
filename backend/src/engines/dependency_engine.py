from dataclasses import dataclass
from datetime import datetime, timezone
from math import isclose
from typing import Any, Iterable

from src.models.dependency import DecisionDependency, DependencyStatus
from src.models.evidence import Evidence
from src.models.marine import DataStatus


USABLE_DATA_STATUSES = {
    DataStatus.REAL,
    DataStatus.SIMULATED,
}

ALLOWED_TRANSITIONS = {
    "DRAFT": {"VALID", "UNVERIFIABLE"},
    "VALID": {"AT_RISK", "VIOLATED", "UNVERIFIABLE", "EXPIRED"},
    "AT_RISK": {"VALID", "VIOLATED", "UNVERIFIABLE", "EXPIRED"},
    "VIOLATED": {"REPAIRED", "UNVERIFIABLE"},
    "REPAIRED": {
        "VALID",
        "AT_RISK",
        "VIOLATED",
        "UNVERIFIABLE",
        "EXPIRED",
    },
    "UNVERIFIABLE": {"VALID", "AT_RISK", "VIOLATED", "EXPIRED"},
    "EXPIRED": set(),
}

_STATUS_PRIORITY = (
    DependencyStatus.UNVERIFIABLE,
    DependencyStatus.VIOLATED,
    DependencyStatus.AT_RISK,
    DependencyStatus.VALID,
)


@dataclass(frozen=True)
class Evaluation:
    status: DependencyStatus
    reason: str
    affected_segments: list[str]
    dependency_id: str | None = None
    current_value: Any = None
    source: str | None = None
    observed_at: datetime | None = None
    evidence_id: str | None = None
    data_status: DataStatus | None = None
    freshness_hours: float | None = None


def transition_allowed(previous: str, current: str) -> bool:
    return current in ALLOWED_TRANSITIONS.get(previous, set())


def aggregate_dependency_statuses(
    statuses: Iterable[DependencyStatus],
) -> DependencyStatus | None:
    status_set = {
        DependencyStatus.UNVERIFIABLE
        if status == DependencyStatus.UNKNOWN
        else status
        for status in statuses
    }

    if not status_set:
        return None

    for status in _STATUS_PRIORITY:
        if status in status_set:
            return status

    return DependencyStatus.UNVERIFIABLE


def evaluate_dependency(
    dependency: DecisionDependency,
    current_value: Any = None,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> Evaluation:
    if evidence is not None:
        return _evaluate_from_evidence(
            dependency,
            evidence,
            as_of,
        )

    return _evaluate_numeric(
        dependency,
        current_value,
        source=dependency.source,
        observed_at=dependency.observed_at,
    )


def evaluate_dependencies(
    dependencies: list[DecisionDependency],
    evidence: list[Evidence] | None = None,
    *,
    as_of: datetime | None = None,
) -> list[Evaluation]:
    return [
        evaluate_dependency(
            dependency,
            evidence=evidence,
            as_of=as_of,
        )
        for dependency in dependencies
    ]


def _evaluate_numeric(
    dependency: DecisionDependency,
    current_value: Any,
    *,
    source: str | None = None,
    observed_at: datetime | None = None,
    evidence_id: str | None = None,
    data_status: DataStatus | None = None,
    freshness_hours: float | None = None,
    reason_prefix: str | None = None,
) -> Evaluation:
    if not _is_numeric(current_value):
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            reason_prefix or "current value is not numeric",
            current_value=current_value,
            source=source,
            observed_at=observed_at,
            evidence_id=evidence_id,
            data_status=data_status,
            freshness_hours=freshness_hours,
        )

    lower = dependency.valid_range.min
    upper = dependency.valid_range.max

    if lower is None and upper is None:
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            "valid range is empty",
            current_value=current_value,
            source=source,
            observed_at=observed_at,
            evidence_id=evidence_id,
            data_status=data_status,
            freshness_hours=freshness_hours,
        )

    if (
        lower is not None and current_value < lower
    ) or (
        upper is not None and current_value > upper
    ):
        bound = (
            upper
            if upper is not None and current_value > upper
            else lower
        )
        return _result(
            dependency,
            DependencyStatus.VIOLATED,
            (
                f"{dependency.parameter} exceeded "
                f"valid range bound {bound}"
            ),
            current_value=current_value,
            source=source,
            observed_at=observed_at,
            evidence_id=evidence_id,
            data_status=data_status,
            freshness_hours=freshness_hours,
        )

    span = abs(
        (upper if upper is not None else lower + 1)
        - (lower if lower is not None else 0)
    )
    margin = span * dependency.valid_range.risk_margin
    at_risk = (
        upper is not None
        and upper - current_value <= margin
    ) or (
        lower is not None
        and current_value - lower <= margin
    )

    status = (
        DependencyStatus.AT_RISK
        if at_risk
        else DependencyStatus.VALID
    )
    reason = (
        f"{dependency.parameter} is near a valid-range limit"
        if at_risk
        else f"{dependency.parameter} is within valid range"
    )

    return _result(
        dependency,
        status,
        reason,
        current_value=current_value,
        source=source,
        observed_at=observed_at,
        evidence_id=evidence_id,
        data_status=data_status,
        freshness_hours=freshness_hours,
    )


def _evaluate_from_evidence(
    dependency: DecisionDependency,
    evidence: list[Evidence],
    as_of: datetime | None,
) -> Evaluation:
    now = _as_utc(as_of or datetime.now(timezone.utc))
    matched = _matching_evidence(dependency, evidence)

    if not matched:
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            (
                f"no evidence available for "
                f"{dependency.parameter}"
            ),
            source=dependency.source,
        )

    invalid = [
        item
        for item in matched
        if not _is_usable_evidence(item)
    ]
    if invalid:
        sample = invalid[0]
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            (
                f"evidence {sample.evidence_id} is not "
                f"usable for threshold validation"
            ),
            current_value=sample.value,
            source=sample.source,
            observed_at=sample.timestamp,
            evidence_id=sample.evidence_id,
            data_status=sample.data_status,
            freshness_hours=_freshness_hours(sample, now),
        )

    fresh: list[Evidence] = []
    stale: list[Evidence] = []
    unverifiable_freshness: list[Evidence] = []

    for item in matched:
        stale_state = _staleness(item, dependency, now)
        if stale_state is None:
            unverifiable_freshness.append(item)
        elif stale_state:
            stale.append(item)
        else:
            fresh.append(item)

    if unverifiable_freshness:
        sample = unverifiable_freshness[0]
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            (
                f"freshness of evidence "
                f"{sample.evidence_id} cannot be verified"
            ),
            current_value=sample.value,
            source=sample.source,
            observed_at=sample.timestamp,
            evidence_id=sample.evidence_id,
            data_status=sample.data_status,
            freshness_hours=_freshness_hours(sample, now),
        )

    if not fresh:
        sample = stale[0]
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            (
                f"evidence {sample.evidence_id} is stale "
                f"for {dependency.parameter}"
            ),
            current_value=sample.value,
            source=sample.source,
            observed_at=sample.timestamp,
            evidence_id=sample.evidence_id,
            data_status=sample.data_status,
            freshness_hours=_freshness_hours(sample, now),
        )

    conflict = _conflicting_evidence(fresh)
    if conflict is not None:
        left, right = conflict
        return _result(
            dependency,
            DependencyStatus.UNVERIFIABLE,
            (
                f"conflicting evidence "
                f"{left.evidence_id} and {right.evidence_id} "
                f"for {dependency.parameter}"
            ),
            current_value=left.value,
            source=left.source,
            observed_at=left.timestamp,
            evidence_id=left.evidence_id,
            data_status=left.data_status,
            freshness_hours=_freshness_hours(left, now),
        )

    selected = max(
        fresh,
        key=lambda item: _as_utc(item.timestamp),
    )

    return _evaluate_numeric(
        dependency,
        selected.value,
        source=selected.source,
        observed_at=selected.timestamp,
        evidence_id=selected.evidence_id,
        data_status=selected.data_status,
        freshness_hours=_freshness_hours(selected, now),
    )


def _matching_evidence(
    dependency: DecisionDependency,
    evidence: list[Evidence],
) -> list[Evidence]:
    matched: list[Evidence] = []

    for item in evidence:
        if item.parameter != dependency.parameter:
            continue

        if (
            dependency.source
            and item.source
            and item.source != dependency.source
        ):
            continue

        matched.append(item)

    return matched


def _is_usable_evidence(item: Evidence) -> bool:
    if item.data_status not in USABLE_DATA_STATUSES:
        return False

    return _is_numeric(item.value)


def _is_numeric(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(
        value,
        bool,
    )


def _staleness(
    item: Evidence,
    dependency: DecisionDependency,
    now: datetime,
) -> bool | None:
    resolution = item.temporal_resolution_h
    if resolution is None:
        resolution = dependency.temporal_resolution_h

    if resolution is None:
        return None

    age_hours = _freshness_hours(item, now)
    if age_hours is None:
        return None

    return age_hours > resolution


def _freshness_hours(
    item: Evidence,
    now: datetime,
) -> float | None:
    timestamp = _as_utc(item.timestamp)
    return (now - timestamp).total_seconds() / 3600.0


def _conflicting_evidence(
    items: list[Evidence],
) -> tuple[Evidence, Evidence] | None:
    for index, left in enumerate(items):
        for right in items[index + 1 :]:
            if not _values_agree(left.value, right.value):
                return left, right

    return None


def _values_agree(left: Any, right: Any) -> bool:
    if not _is_numeric(left) or not _is_numeric(right):
        return left == right

    return isclose(
        float(left),
        float(right),
        rel_tol=1e-9,
        abs_tol=1e-9,
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _result(
    dependency: DecisionDependency,
    status: DependencyStatus,
    reason: str,
    *,
    current_value: Any = None,
    source: str | None = None,
    observed_at: datetime | None = None,
    evidence_id: str | None = None,
    data_status: DataStatus | None = None,
    freshness_hours: float | None = None,
) -> Evaluation:
    return Evaluation(
        status=status,
        reason=reason,
        affected_segments=list(dependency.segment_ids),
        dependency_id=dependency.dependency_id,
        current_value=current_value,
        source=source,
        observed_at=observed_at,
        evidence_id=evidence_id,
        data_status=data_status,
        freshness_hours=freshness_hours,
    )
