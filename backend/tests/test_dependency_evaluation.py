from copy import deepcopy
from datetime import datetime, timedelta, timezone

from src.engines.dependency_engine import evaluate_dependency
from src.models.commitment import (
    CommitmentSegment,
    MarineCommitment,
)
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)
from src.models.evidence import Evidence
from src.models.marine import DataStatus
from src.services.dependency_service import (
    apply_dependency_evaluations,
    derive_commitment_state,
    evaluate_commitment_dependencies,
)


NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def make_dependency(
    *,
    dependency_id: str = "D1",
    parameter: str = "wave_height",
    source: str = "buoy-a",
    segment_ids: list[str] | None = None,
) -> DecisionDependency:
    return DecisionDependency(
        dependency_id=dependency_id,
        parameter=parameter,
        source=source,
        value_at_commit=1.4,
        valid_range=ValueRange(min=0, max=2, risk_margin=0.1),
        temporal_resolution_h=1,
        observed_at=NOW,
        segment_ids=segment_ids or ["SEG-3"],
    )


def make_evidence(
    *,
    evidence_id: str = "E1",
    parameter: str = "wave_height",
    source: str = "buoy-a",
    value: object = 1.4,
    timestamp: datetime | None = None,
    data_status: DataStatus = DataStatus.REAL,
    temporal_resolution_h: float | None = 1,
) -> Evidence:
    return Evidence(
        evidence_id=evidence_id,
        parameter=parameter,
        source=source,
        value=value,
        unit="m",
        timestamp=timestamp or NOW,
        data_status=data_status,
        temporal_resolution_h=temporal_resolution_h,
    )


def make_commitment(
    dependencies: list[DecisionDependency],
    evidence: list[Evidence],
) -> MarineCommitment:
    return MarineCommitment(
        commitment_id="C-DEP-1",
        stakeholder_type="FISHERMAN",
        decision_type="FISHING_TRIP",
        decision_summary="dependency evaluation fixture",
        segments=[
            CommitmentSegment(
                segment_id="SEG-3",
                label="Return",
                start_time=NOW,
                end_time=NOW + timedelta(hours=1),
            )
        ],
        dependencies=dependencies,
        evidence=evidence,
        created_at=NOW,
        updated_at=NOW,
        last_updated_at=NOW,
    )


def test_valid_evidence() -> None:
    dependency = make_dependency()
    evidence = [make_evidence(value=1.4)]

    result = evaluate_dependency(
        dependency,
        evidence=evidence,
        as_of=NOW,
    )

    assert result.status == DependencyStatus.VALID
    assert result.current_value == 1.4
    assert result.source == "buoy-a"
    assert result.observed_at == NOW
    assert result.evidence_id == "E1"
    assert result.data_status == DataStatus.REAL
    assert result.freshness_hours == 0
    assert result.affected_segments == ["SEG-3"]
    assert "within valid range" in result.reason


def test_at_risk_near_threshold() -> None:
    result = evaluate_dependency(
        make_dependency(),
        evidence=[make_evidence(value=1.95)],
        as_of=NOW,
    )

    assert result.status == DependencyStatus.AT_RISK
    assert result.current_value == 1.95
    assert "near a valid-range limit" in result.reason


def test_violated_threshold() -> None:
    result = evaluate_dependency(
        make_dependency(),
        evidence=[make_evidence(value=2.3)],
        as_of=NOW,
    )

    assert result.status == DependencyStatus.VIOLATED
    assert result.current_value == 2.3
    assert "exceeded valid range bound" in result.reason


def test_missing_evidence_is_unverifiable() -> None:
    result = evaluate_dependency(
        make_dependency(),
        evidence=[],
        as_of=NOW,
    )

    assert result.status == DependencyStatus.UNVERIFIABLE
    assert "no evidence available" in result.reason


def test_stale_evidence_is_unverifiable() -> None:
    stale_time = NOW - timedelta(hours=3)
    result = evaluate_dependency(
        make_dependency(),
        evidence=[make_evidence(timestamp=stale_time)],
        as_of=NOW,
    )

    assert result.status == DependencyStatus.UNVERIFIABLE
    assert "stale" in result.reason
    assert result.observed_at == stale_time
    assert result.freshness_hours == 3
    assert result.source == "buoy-a"


def test_invalid_evidence_is_unverifiable() -> None:
    unknown = evaluate_dependency(
        make_dependency(),
        evidence=[
            make_evidence(
                value=1.4,
                data_status=DataStatus.UNKNOWN,
            )
        ],
        as_of=NOW,
    )
    assumed = evaluate_dependency(
        make_dependency(),
        evidence=[
            make_evidence(
                value=1.4,
                data_status=DataStatus.ASSUMED,
            )
        ],
        as_of=NOW,
    )
    non_numeric = evaluate_dependency(
        make_dependency(),
        evidence=[make_evidence(value="rough")],
        as_of=NOW,
    )

    assert unknown.status == DependencyStatus.UNVERIFIABLE
    assert assumed.status == DependencyStatus.UNVERIFIABLE
    assert non_numeric.status == DependencyStatus.UNVERIFIABLE
    assert "not usable" in unknown.reason
    assert "not usable" in assumed.reason
    assert "not usable" in non_numeric.reason


def test_conflicting_evidence_is_unverifiable() -> None:
    result = evaluate_dependency(
        make_dependency(),
        evidence=[
            make_evidence(evidence_id="E1", value=1.2),
            make_evidence(evidence_id="E2", value=1.8),
        ],
        as_of=NOW,
    )

    assert result.status == DependencyStatus.UNVERIFIABLE
    assert "conflicting evidence" in result.reason
    assert "E1" in result.reason
    assert "E2" in result.reason


def test_multiple_dependencies_aggregate_worst_state() -> None:
    wave = make_dependency(
        dependency_id="D-WAVE",
        parameter="wave_height",
    )
    wind = make_dependency(
        dependency_id="D-WIND",
        parameter="wind_speed",
        source="anemometer",
    )
    wind.valid_range = ValueRange(min=0, max=20, risk_margin=0.1)

    commitment = make_commitment(
        [wave, wind],
        [
            make_evidence(parameter="wave_height", value=2.4),
            make_evidence(
                evidence_id="E-WIND",
                parameter="wind_speed",
                source="anemometer",
                value=8.0,
            ),
        ],
    )
    snapshot = deepcopy(commitment)

    results = evaluate_commitment_dependencies(
        commitment,
        as_of=NOW,
    )

    assert commitment.model_dump() == snapshot.model_dump()
    assert results[0].status == DependencyStatus.VIOLATED
    assert results[1].status == DependencyStatus.VALID
    assert derive_commitment_state(
        [item.status for item in results]
    ).value == "VIOLATED"


def test_unverifiable_dependency_does_not_infer_safety() -> None:
    wave = make_dependency(dependency_id="D-WAVE")
    current = make_dependency(
        dependency_id="D-CURRENT",
        parameter="current_speed",
        source="adcp",
    )
    current.valid_range = ValueRange(min=0, max=1.5)

    results = evaluate_commitment_dependencies(
        make_commitment(
            [wave, current],
            [make_evidence(parameter="wave_height", value=1.1)],
        ),
        as_of=NOW,
    )

    assert results[0].status == DependencyStatus.VALID
    assert results[1].status == DependencyStatus.UNVERIFIABLE
    assert derive_commitment_state(
        [item.status for item in results]
    ).value == "UNVERIFIABLE"


def test_recovery_back_to_valid() -> None:
    dependency = make_dependency()
    violated = evaluate_dependency(
        dependency,
        evidence=[make_evidence(value=2.6)],
        as_of=NOW,
    )
    recovered = evaluate_dependency(
        dependency,
        evidence=[make_evidence(value=1.3)],
        as_of=NOW,
    )

    assert violated.status == DependencyStatus.VIOLATED
    assert recovered.status == DependencyStatus.VALID
    assert dependency.status == DependencyStatus.UNKNOWN


def test_apply_evaluation_is_explicit() -> None:
    commitment = make_commitment(
        [make_dependency()],
        [make_evidence(value=2.4)],
    )
    before = commitment.dependencies[0].status

    results = evaluate_commitment_dependencies(
        commitment,
        as_of=NOW,
    )
    assert commitment.dependencies[0].status == before

    apply_dependency_evaluations(commitment, results)

    assert commitment.dependencies[0].status == DependencyStatus.VIOLATED
    assert commitment.state.value == "DRAFT"
    assert commitment.dependencies[0].value_at_commit == 1.4
