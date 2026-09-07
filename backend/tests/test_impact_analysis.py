from copy import deepcopy
from datetime import datetime, timedelta, timezone

from src.engines.dependency_engine import Evaluation
from src.models.commitment import (
    CommitmentSegment,
    CommitmentState,
    MarineCommitment,
)
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)
from src.services.impact_analysis_service import (
    analyze_commitment_impact,
)


NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def _segment(segment_id: str, hour: int) -> CommitmentSegment:
    start = NOW.replace(hour=hour)
    return CommitmentSegment(
        segment_id=segment_id,
        label=segment_id,
        start_time=start,
        end_time=start + timedelta(hours=1),
    )


def _dependency(
    dependency_id: str,
    parameter: str,
    segment_ids: list[str],
) -> DecisionDependency:
    return DecisionDependency(
        dependency_id=dependency_id,
        parameter=parameter,
        source="test",
        value_at_commit=1.0,
        valid_range=ValueRange(min=0, max=2),
        segment_ids=segment_ids,
    )


def _commitment() -> MarineCommitment:
    return MarineCommitment(
        commitment_id="C-IMP-1",
        stakeholder_type="FISHERMAN",
        decision_type="FISHING_TRIP",
        decision_summary="impact analysis fixture",
        segments=[
            _segment("SEG-1", 8),
            _segment("SEG-2", 9),
            _segment("SEG-3", 10),
            _segment("SEG-4", 11),
        ],
        dependencies=[
            _dependency("DEP-A", "wind_speed", ["SEG-1"]),
            _dependency("DEP-B", "current_speed", ["SEG-2"]),
            _dependency("DEP-C", "wave_height", ["SEG-3"]),
            _dependency("DEP-D", "visibility", ["SEG-4"]),
        ],
        state=CommitmentState.VALID,
        created_at=NOW,
        updated_at=NOW,
        last_updated_at=NOW,
    )


def _evaluation(
    dependency: DecisionDependency,
    status: DependencyStatus,
) -> Evaluation:
    return Evaluation(
        status=status,
        reason=f"{dependency.parameter} is {status.value}",
        affected_segments=list(dependency.segment_ids),
        dependency_id=dependency.dependency_id,
        source=dependency.source,
    )


def _all(
    commitment: MarineCommitment,
    statuses: dict[str, DependencyStatus],
) -> list[Evaluation]:
    return [
        _evaluation(
            dependency,
            statuses[dependency.dependency_id],
        )
        for dependency in commitment.dependencies
    ]


def test_no_affected_segments_has_no_operational_impact() -> None:
    commitment = _commitment()
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VALID,
                "DEP-B": DependencyStatus.VALID,
                "DEP-C": DependencyStatus.VALID,
                "DEP-D": DependencyStatus.VALID,
            },
        ),
    )

    assert result.affected_segment_impacts == ()
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-3",
        "SEG-4",
    )
    assert result.operational_impact == "VALID"
    assert result.proposed_commitment_state == "VALID"
    assert result.current_commitment_state == "VALID"
    assert result.triggering_dependency_ids == ()
    assert result.deterministic is True
    assert result.could_not_evaluate is False


def test_one_affected_segment_violation() -> None:
    commitment = _commitment()
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VALID,
                "DEP-B": DependencyStatus.VALID,
                "DEP-C": DependencyStatus.VIOLATED,
                "DEP-D": DependencyStatus.VALID,
            },
        ),
    )

    assert len(result.affected_segment_impacts) == 1
    impact = result.affected_segment_impacts[0]
    assert impact.segment_id == "SEG-3"
    assert impact.operational_impact == "VIOLATED"
    assert impact.triggering_dependency_ids == ("DEP-C",)
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )
    assert result.proposed_commitment_state == "VIOLATED"
    assert result.operational_impact == "VIOLATED"
    assert result.current_commitment_state == "VALID"


def test_multiple_affected_segments() -> None:
    commitment = _commitment()
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.AT_RISK,
                "DEP-B": DependencyStatus.VALID,
                "DEP-C": DependencyStatus.VIOLATED,
                "DEP-D": DependencyStatus.VALID,
            },
        ),
    )

    by_id = {
        item.segment_id: item
        for item in result.affected_segment_impacts
    }
    assert set(by_id) == {"SEG-1", "SEG-3"}
    assert by_id["SEG-1"].operational_impact == "AT_RISK"
    assert by_id["SEG-3"].operational_impact == "VIOLATED"
    assert result.unaffected_segment_ids == ("SEG-2", "SEG-4")
    assert result.proposed_commitment_state == "VIOLATED"
    assert result.operational_impact == "VIOLATED"


def test_unverifiable_dependency_impact() -> None:
    commitment = _commitment()
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VALID,
                "DEP-B": DependencyStatus.UNVERIFIABLE,
                "DEP-C": DependencyStatus.VALID,
                "DEP-D": DependencyStatus.VALID,
            },
        ),
    )

    assert len(result.affected_segment_impacts) == 1
    impact = result.affected_segment_impacts[0]
    assert impact.segment_id == "SEG-2"
    assert impact.operational_impact == "UNVERIFIABLE"
    assert result.proposed_commitment_state == "UNVERIFIABLE"
    assert result.operational_impact == "UNVERIFIABLE"
    assert result.could_not_evaluate is True
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-3",
        "SEG-4",
    )


def test_multiple_triggering_dependencies() -> None:
    commitment = _commitment()
    commitment.dependencies[2].segment_ids = ["SEG-3"]
    commitment.dependencies.append(
        _dependency("DEP-E", "wave_period", ["SEG-3"])
    )
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VALID,
                "DEP-B": DependencyStatus.VALID,
                "DEP-C": DependencyStatus.VIOLATED,
                "DEP-D": DependencyStatus.VALID,
                "DEP-E": DependencyStatus.AT_RISK,
            },
        ),
    )

    impact = result.affected_segment_impacts[0]
    assert impact.segment_id == "SEG-3"
    assert impact.triggering_dependency_ids == ("DEP-C", "DEP-E")
    assert impact.operational_impact == "VIOLATED"
    assert result.triggering_dependency_ids == ("DEP-C", "DEP-E")
    assert result.proposed_commitment_state == "VIOLATED"


def test_no_silent_commitment_mutation() -> None:
    commitment = _commitment()
    snapshot = deepcopy(commitment.model_dump())
    analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VIOLATED,
                "DEP-B": DependencyStatus.VIOLATED,
                "DEP-C": DependencyStatus.UNVERIFIABLE,
                "DEP-D": DependencyStatus.AT_RISK,
            },
        ),
    )

    assert commitment.model_dump() == snapshot
    assert commitment.state == CommitmentState.VALID


def test_unaffected_segments_remain_unchanged() -> None:
    commitment = _commitment()
    original = [
        segment.model_dump()
        for segment in commitment.segments
    ]
    result = analyze_commitment_impact(
        commitment,
        _all(
            commitment,
            {
                "DEP-A": DependencyStatus.VALID,
                "DEP-B": DependencyStatus.VALID,
                "DEP-C": DependencyStatus.VIOLATED,
                "DEP-D": DependencyStatus.VALID,
            },
        ),
    )

    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )
    assert [
        segment.model_dump()
        for segment in commitment.segments
    ] == original


def test_repeated_analysis_is_deterministic() -> None:
    commitment = _commitment()
    evaluations = _all(
        commitment,
        {
            "DEP-A": DependencyStatus.AT_RISK,
            "DEP-B": DependencyStatus.UNVERIFIABLE,
            "DEP-C": DependencyStatus.VIOLATED,
            "DEP-D": DependencyStatus.VALID,
        },
    )

    first = analyze_commitment_impact(commitment, evaluations)
    second = analyze_commitment_impact(commitment, evaluations)

    assert first == second
    assert first.as_dict() == second.as_dict()
    assert first.deterministic is True
