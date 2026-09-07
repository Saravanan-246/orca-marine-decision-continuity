from copy import deepcopy
from math import inf, nan

from src.engines.repair_engine import (
    RepairCandidate,
    RepairCandidateSet,
)
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
from src.engines.dependency_engine import Evaluation
from src.services.repair_service import (
    generate_candidates,
    rank_candidates,
)
from datetime import datetime, timedelta, timezone


NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def _candidate(
    option_id: str,
    score: float,
    *,
    accepted: bool = True,
    affected: tuple[str, ...] = ("SEG-3",),
    preserved: tuple[str, ...] = ("SEG-1", "SEG-2", "SEG-4"),
    rejection_reason: str | None = None,
) -> RepairCandidate:
    return RepairCandidate(
        option_id=option_id,
        repair_type="TIME_SHIFT",
        affected_segments=affected,
        preserved_segments=preserved,
        changes={"shift_hours": 2.0},
        disruption_score=score,
        reason="test candidate",
        accepted=accepted,
        rejection_reason=rejection_reason,
    )


def _set(
    candidates: tuple[RepairCandidate, ...] = (),
    rejected: tuple[RepairCandidate, ...] = (),
) -> RepairCandidateSet:
    return RepairCandidateSet(
        commitment_id="C-RANK-1",
        triggering_dependency_ids=("DEP-C",),
        affected_segment_ids=("SEG-3",),
        unaffected_segment_ids=("SEG-1", "SEG-2", "SEG-4"),
        candidates=candidates,
        rejected=rejected,
        deterministic=True,
    )


def test_zero_candidates_selects_nothing() -> None:
    ranking = rank_candidates(_set())

    assert ranking.selected is None
    assert ranking.ranked == ()
    assert ranking.deterministic is True
    assert ranking.unaffected_segment_ids == (
        "SEG-1",
        "SEG-2",
        "SEG-4",
    )


def test_one_candidate_is_selected() -> None:
    only = _candidate("OPT-ONLY-1", 3.0)
    ranking = rank_candidates(_set(candidates=(only,)))

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-ONLY-1"
    assert ranking.ranked == (only,)
    assert ranking.tie_broken is False


def test_multiple_candidates_select_minimum_score() -> None:
    low = _candidate("OPT-ROUTE-1", 4.0)
    high = _candidate("OPT-TIME-1", 1.0)
    ranking = rank_candidates(_set(candidates=(low, high)))

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-TIME-1"
    assert ranking.selected.disruption_score == 1.0
    assert [item.option_id for item in ranking.ranked] == [
        "OPT-TIME-1",
        "OPT-ROUTE-1",
    ]


def test_equal_scores_break_ties_by_option_id() -> None:
    later = _candidate("OPT-B", 2.0)
    earlier = _candidate("OPT-A", 2.0)
    ranking = rank_candidates(_set(candidates=(later, earlier)))

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-A"
    assert ranking.tie_broken is True
    assert ranking.ranked[0].option_id == "OPT-A"
    assert ranking.ranked[1].option_id == "OPT-B"

    again = rank_candidates(_set(candidates=(later, earlier)))
    assert again == ranking


def test_rejected_candidates_are_not_selected() -> None:
    rejected = _candidate(
        "OPT-REJECT-1",
        0.0,
        accepted=False,
        rejection_reason="would change unaffected segments",
        affected=("SEG-3", "SEG-1"),
    )
    valid = _candidate("OPT-OK-1", 5.0)
    ranking = rank_candidates(
        _set(
            candidates=(valid,),
            rejected=(rejected,),
        )
    )

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-OK-1"
    assert rejected in ranking.ineligible
    assert ranking.selected.affected_segments == ("SEG-3",)
    assert "SEG-1" in ranking.unaffected_segment_ids


def test_invalid_and_missing_scores_are_ineligible() -> None:
    missing = _candidate("OPT-MISSING", nan)
    infinite = _candidate("OPT-INF", inf)
    valid = _candidate("OPT-OK-2", 8.0)

    ranking = rank_candidates(
        _set(candidates=(missing, infinite, valid))
    )

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-OK-2"
    assert {item.option_id for item in ranking.ineligible} == {
        "OPT-MISSING",
        "OPT-INF",
    }
    assert ranking.ranked[0].option_id == "OPT-OK-2"


def test_ranking_generated_candidates_does_not_mutate() -> None:
    commitment = MarineCommitment(
        commitment_id="C-RANK-LIVE",
        stakeholder_type="FISHERMAN",
        decision_type="FISHING_TRIP",
        decision_summary="ranking fixture",
        segments=[
            CommitmentSegment(
                segment_id="SEG-1",
                label="SEG-1",
                start_time=NOW,
                end_time=NOW + timedelta(hours=1),
            ),
            CommitmentSegment(
                segment_id="SEG-3",
                label="SEG-3",
                start_time=NOW + timedelta(hours=1),
                end_time=NOW + timedelta(hours=2),
            ),
        ],
        dependencies=[
            DecisionDependency(
                dependency_id="DEP-C",
                parameter="wave_height",
                source="test",
                value_at_commit=1.0,
                valid_range=ValueRange(min=0, max=2),
                segment_ids=["SEG-3"],
            )
        ],
        state=CommitmentState.VALID,
        created_at=NOW,
        updated_at=NOW,
        last_updated_at=NOW,
    )
    snapshot = deepcopy(commitment.model_dump())
    evaluations = [
        Evaluation(
            status=DependencyStatus.VIOLATED,
            reason="wave_height is VIOLATED",
            affected_segments=["SEG-3"],
            dependency_id="DEP-C",
            source="test",
        )
    ]

    generated = generate_candidates(
        commitment,
        evaluations=evaluations,
    )
    ranking = rank_candidates(generated)

    assert ranking.selected is not None
    assert ranking.selected.option_id == "OPT-TIME-1"
    assert ranking.selected.preserved_segments == ("SEG-1",)
    assert ranking.unaffected_segment_ids == ("SEG-1",)
    assert commitment.model_dump() == snapshot
    assert commitment.state == CommitmentState.VALID
