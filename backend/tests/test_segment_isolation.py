from copy import deepcopy
from datetime import datetime, timedelta, timezone

from src.engines.dependency_engine import Evaluation
from src.models.commitment import CommitmentSegment, MarineCommitment
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)
from src.services.segment_isolation_service import (
    isolate_commitment_segments,
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
    status: DependencyStatus = DependencyStatus.VALID,
) -> DecisionDependency:
    return DecisionDependency(
        dependency_id=dependency_id,
        parameter=parameter,
        source="test",
        value_at_commit=1.0,
        valid_range=ValueRange(min=0, max=2),
        status=status,
        segment_ids=segment_ids,
    )


def _commitment(
    dependencies: list[DecisionDependency],
) -> MarineCommitment:
    return MarineCommitment(
        commitment_id="C-ISO-1",
        stakeholder_type="FISHERMAN",
        decision_type="FISHING_TRIP",
        decision_summary="segment isolation fixture",
        segments=[
            _segment("SEG-1", 8),
            _segment("SEG-2", 9),
            _segment("SEG-3", 10),
            _segment("SEG-4", 11),
        ],
        dependencies=dependencies,
        created_at=NOW,
        updated_at=NOW,
        last_updated_at=NOW,
    )


def _evaluation(
    dependency: DecisionDependency,
    status: DependencyStatus,
    segment_ids: list[str] | None = None,
) -> Evaluation:
    return Evaluation(
        status=status,
        reason=f"{dependency.parameter} is {status.value}",
        affected_segments=(
            list(segment_ids)
            if segment_ids is not None
            else list(dependency.segment_ids)
        ),
        dependency_id=dependency.dependency_id,
        current_value=dependency.current_value,
        source=dependency.source,
    )


def _example_commitment() -> MarineCommitment:
    return _commitment(
        [
            _dependency("DEP-A", "wind_speed", ["SEG-1"]),
            _dependency("DEP-B", "current_speed", ["SEG-2"]),
            _dependency("DEP-C", "wave_height", ["SEG-3"]),
            _dependency("DEP-D", "visibility", ["SEG-4"]),
        ]
    )


def test_no_affected_segments_when_all_valid() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(item, DependencyStatus.VALID)
        for item in commitment.dependencies
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ()
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-3",
        "SEG-4",
    )
    assert result.triggering_dependency_ids == ()
    assert result.deterministic is True
    assert result.could_not_evaluate is False


def test_one_affected_segment() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(commitment.dependencies[1], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[3], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ("SEG-3",)
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )
    assert result.triggering_dependency_ids == ("DEP-C",)
    assert dict(result.triggering_states) == {
        "DEP-C": "VIOLATED",
    }


def test_multiple_affected_segments() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(
            commitment.dependencies[0],
            DependencyStatus.AT_RISK,
        ),
        _evaluation(commitment.dependencies[1], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[3], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ("SEG-1", "SEG-3")
    assert result.unaffected_segment_ids == ("SEG-2", "SEG-4")
    assert result.triggering_dependency_ids == ("DEP-A", "DEP-C")


def test_one_dependency_mapped_to_multiple_segments() -> None:
    commitment = _commitment(
        [
            _dependency("DEP-A", "wind_speed", ["SEG-1"]),
            _dependency(
                "DEP-WAVE",
                "wave_height",
                ["SEG-2", "SEG-3"],
            ),
            _dependency("DEP-D", "visibility", ["SEG-4"]),
        ]
    )
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[1],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[2], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ("SEG-2", "SEG-3")
    assert result.unaffected_segment_ids == ("SEG-1", "SEG-4")
    assert result.triggering_dependency_ids == ("DEP-WAVE",)


def test_multiple_violated_dependencies() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(
            commitment.dependencies[0],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[1], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[3], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ("SEG-1", "SEG-3")
    assert result.triggering_dependency_ids == ("DEP-A", "DEP-C")
    assert dict(result.triggering_states) == {
        "DEP-A": "VIOLATED",
        "DEP-C": "VIOLATED",
    }
    assert "SEG-2" in result.unaffected_segment_ids
    assert "SEG-4" in result.unaffected_segment_ids


def test_unverifiable_dependency_isolates_mapped_segment() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[1],
            DependencyStatus.UNVERIFIABLE,
        ),
        _evaluation(commitment.dependencies[2], DependencyStatus.VALID),
        _evaluation(commitment.dependencies[3], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ("SEG-2",)
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-3",
        "SEG-4",
    )
    assert result.triggering_dependency_ids == ("DEP-B",)
    assert result.unverifiable_dependency_ids == ("DEP-B",)
    assert result.could_not_evaluate is True
    assert result.deterministic is True


def test_missing_dependency_mapping() -> None:
    commitment = _commitment(
        [
            _dependency("DEP-A", "wind_speed", ["SEG-1"]),
            _dependency("DEP-C", "wave_height", []),
            _dependency("DEP-GHOST", "visibility", ["SEG-MISSING"]),
        ]
    )
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[1],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.affected_segment_ids == ()
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-3",
        "SEG-4",
    )
    assert result.triggering_dependency_ids == (
        "DEP-C",
        "DEP-GHOST",
    )
    assert result.unmapped_dependency_ids == (
        "DEP-C",
        "DEP-GHOST",
    )
    assert result.unknown_segment_ids == ("SEG-MISSING",)


def test_unaffected_segments_preserved_exactly() -> None:
    commitment = _example_commitment()
    original_segments = [
        segment.model_dump()
        for segment in commitment.segments
    ]
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(commitment.dependencies[1], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(commitment.dependencies[3], DependencyStatus.VALID),
    ]

    result = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )
    assert [
        segment.model_dump()
        for segment in commitment.segments
    ] == original_segments


def test_no_silent_commitment_mutation() -> None:
    commitment = _example_commitment()
    snapshot = deepcopy(commitment.model_dump())
    evaluations = [
        _evaluation(item, DependencyStatus.VIOLATED)
        for item in commitment.dependencies
    ]

    isolate_commitment_segments(commitment, evaluations)

    assert commitment.model_dump() == snapshot


def test_repeated_evaluation_is_deterministic() -> None:
    commitment = _example_commitment()
    evaluations = [
        _evaluation(commitment.dependencies[0], DependencyStatus.VALID),
        _evaluation(
            commitment.dependencies[1],
            DependencyStatus.AT_RISK,
        ),
        _evaluation(
            commitment.dependencies[2],
            DependencyStatus.VIOLATED,
        ),
        _evaluation(
            commitment.dependencies[3],
            DependencyStatus.UNVERIFIABLE,
        ),
    ]

    first = isolate_commitment_segments(
        commitment,
        evaluations,
    )
    second = isolate_commitment_segments(
        commitment,
        evaluations,
    )

    assert first == second
    assert first.as_dict() == second.as_dict()
    assert first.deterministic is True
    assert first.affected_segment_ids == (
        "SEG-2",
        "SEG-3",
        "SEG-4",
    )
    assert first.unaffected_segment_ids == ("SEG-1",)
