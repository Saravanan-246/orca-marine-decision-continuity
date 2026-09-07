from copy import deepcopy
from datetime import datetime, timedelta, timezone

from src.engines.dependency_engine import Evaluation
from src.engines.repair_engine import validate_repair_candidate
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
from src.models.repair import RepairOption
from src.services.repair_service import generate_candidates


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
        commitment_id="C-REP-1",
        stakeholder_type="FISHERMAN",
        decision_type="FISHING_TRIP",
        decision_summary="repair candidate fixture",
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


def _evaluations(
    commitment: MarineCommitment,
    statuses: dict[str, DependencyStatus],
) -> list[Evaluation]:
    return [
        Evaluation(
            status=statuses[dependency.dependency_id],
            reason=(
                f"{dependency.parameter} is "
                f"{statuses[dependency.dependency_id].value}"
            ),
            affected_segments=list(dependency.segment_ids),
            dependency_id=dependency.dependency_id,
            source=dependency.source,
        )
        for dependency in commitment.dependencies
    ]


def _valid_map() -> dict[str, DependencyStatus]:
    return {
        "DEP-A": DependencyStatus.VALID,
        "DEP-B": DependencyStatus.VALID,
        "DEP-C": DependencyStatus.VALID,
        "DEP-D": DependencyStatus.VALID,
    }


def test_one_affected_segment_candidates() -> None:
    commitment = _commitment()
    statuses = _valid_map()
    statuses["DEP-C"] = DependencyStatus.VIOLATED

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
    )

    assert result.affected_segment_ids == ("SEG-3",)
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )
    assert result.triggering_dependency_ids == ("DEP-C",)
    assert result.candidates
    assert result.rejected == ()
    for candidate in result.candidates:
        assert candidate.accepted is True
        assert candidate.affected_segments == ("SEG-3",)
        assert candidate.preserved_segments == (
            "SEG-1",
            "SEG-2",
            "SEG-4",
        )
        assert "disruption_score" in candidate.as_dict()


def test_multiple_affected_segment_candidates() -> None:
    commitment = _commitment()
    statuses = _valid_map()
    statuses["DEP-A"] = DependencyStatus.AT_RISK
    statuses["DEP-C"] = DependencyStatus.VIOLATED

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
    )

    assert result.affected_segment_ids == ("SEG-1", "SEG-3")
    assert result.unaffected_segment_ids == ("SEG-2", "SEG-4")
    for candidate in result.candidates:
        assert set(candidate.affected_segments) == {
            "SEG-1",
            "SEG-3",
        }
        assert "SEG-2" not in candidate.affected_segments
        assert "SEG-4" not in candidate.affected_segments


def test_no_affected_segments_yields_no_candidates() -> None:
    commitment = _commitment()

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, _valid_map()),
    )

    assert result.candidates == ()
    assert result.rejected == ()
    assert result.affected_segment_ids == ()
    assert result.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-3",
        "SEG-4",
    )
    assert result.deterministic is True


def test_invalid_candidate_is_rejected() -> None:
    commitment = _commitment()
    statuses = _valid_map()
    statuses["DEP-C"] = DependencyStatus.VIOLATED
    invalid = RepairOption(
        option_id="",
        repair_type="TIME_SHIFT",
        affected_segments=["SEG-3"],
        changes={"shift_hours": 2.0},
        disruption_score=9.0,
        reason="invalid empty id",
    )

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
        extra_options=[invalid],
    )

    assert any(
        item.option_id == "" and item.accepted is False
        for item in result.rejected
    )
    assert any(
        item.rejection_reason == "candidate option_id is empty"
        for item in result.rejected
    )


def test_candidate_changing_unaffected_segments_is_rejected() -> None:
    commitment = _commitment()
    statuses = _valid_map()
    statuses["DEP-C"] = DependencyStatus.VIOLATED
    leak = RepairOption(
        option_id="OPT-LEAK-1",
        repair_type="TIME_SHIFT",
        affected_segments=["SEG-3", "SEG-1"],
        changes={"shift_hours": 4.0},
        disruption_score=99.0,
        reason="would shift an unaffected segment",
    )

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
        extra_options=[leak],
    )

    rejected = next(
        item
        for item in result.rejected
        if item.option_id == "OPT-LEAK-1"
    )
    assert rejected.accepted is False
    assert "unaffected segment" in (rejected.rejection_reason or "")
    assert "SEG-1" in (rejected.rejection_reason or "")
    assert all(
        "SEG-1" not in item.affected_segments
        for item in result.candidates
    )

    reason = validate_repair_candidate(
        commitment,
        leak,
        ["SEG-3"],
    )
    assert reason is not None
    assert "SEG-1" in reason


def test_multiple_valid_candidates_include_disruption_scores() -> None:
    commitment = _commitment()
    statuses = _valid_map()
    statuses["DEP-C"] = DependencyStatus.VIOLATED

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
    )

    types = {item.repair_type for item in result.candidates}
    assert "TIME_SHIFT" in types
    assert "ROUTE_SHIFT" in types
    assert len(result.candidates) >= 2
    assert all(
        isinstance(item.disruption_score, float)
        for item in result.candidates
    )
    assert {item.option_id for item in result.candidates} == {
        "OPT-TIME-1",
        "OPT-ROUTE-1",
    }
    assert result.deterministic is True


def test_generation_does_not_mutate_or_apply() -> None:
    commitment = _commitment()
    snapshot = deepcopy(commitment.model_dump())
    statuses = _valid_map()
    statuses["DEP-C"] = DependencyStatus.VIOLATED

    result = generate_candidates(
        commitment,
        evaluations=_evaluations(commitment, statuses),
    )

    assert result.candidates
    assert commitment.model_dump() == snapshot
    assert commitment.state == CommitmentState.VALID
    assert all(
        segment.start_time.hour == expected
        for segment, expected in zip(
            commitment.segments,
            [8, 9, 10, 11],
            strict=True,
        )
    )
