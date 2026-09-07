from datetime import datetime, timedelta, timezone

from src.engines.conflict_engine import check_pair
from src.engines.repair_engine import generate_repair
from src.models.commitment import (
    CommitmentSegment,
    MarineCommitment,
)
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)


NOW = datetime(
    2026,
    1,
    1,
    tzinfo=timezone.utc,
)


def build_commitment(
    commitment_id: str,
    stakeholder: str,
    start: datetime,
    end: datetime,
    geometry: str,
) -> MarineCommitment:
    same_geometry = {
        "type": "Polygon",
        "coordinates": [
            [
                [0, 0],
                [0, 10],
                [10, 10],
                [10, 0],
                [0, 0],
            ]
        ],
    }

    different_geometry = {
        "type": "Polygon",
        "coordinates": [
            [
                [20, 20],
                [20, 30],
                [30, 30],
                [30, 20],
                [20, 20],
            ]
        ],
    }

    return MarineCommitment(
        commitment_id=commitment_id,
        stakeholder_type=stakeholder,
        decision_type=(
            "closure"
            if stakeholder == "authority"
            else "route"
        ),
        decision_summary="test commitment",
        spatial_scope=(
            same_geometry
            if geometry == "same"
            else different_geometry
        ),
        segments=[
            CommitmentSegment(
                segment_id="SEG-1",
                label="test segment",
                start_time=start,
                end_time=end,
            )
        ],
        dependencies=[],
        evidence=[],
    )


def build_dependency(
    dependency_id: str = "D",
) -> DecisionDependency:
    return DecisionDependency(
        dependency_id=dependency_id,
        parameter="wave_height",
        source="demo",
        value_at_commit=1.4,
        valid_range=ValueRange(
            max=2.0,
        ),
        status=DependencyStatus.VIOLATED,
    )


def test_conflict_requires_time_and_space_overlap() -> None:
    new = build_commitment(
        "N",
        "fisherman",
        NOW + timedelta(hours=2),
        NOW + timedelta(hours=3),
        "same",
    )

    existing = build_commitment(
        "E",
        "authority",
        NOW,
        NOW + timedelta(hours=4),
        "same",
    )

    assert check_pair(
        new,
        existing,
    ).conflict

    assert not check_pair(
        new,
        build_commitment(
            "E2",
            "authority",
            NOW,
            NOW + timedelta(hours=1),
            "same",
        ),
    ).conflict

    assert not check_pair(
        new,
        build_commitment(
            "E3",
            "authority",
            NOW,
            NOW + timedelta(hours=4),
            "different",
        ),
    ).conflict


def test_repair_preserves_unaffected_segments() -> None:
    commitment = MarineCommitment(
        commitment_id="C",
        stakeholder_type="fisherman",
        decision_type="route",
        decision_summary="test",
        segments=[
            CommitmentSegment(
                segment_id="SEG-1",
                label="departure",
                start_time=NOW,
                end_time=NOW + timedelta(hours=1),
            ),
            CommitmentSegment(
                segment_id="SEG-3",
                label="return",
                start_time=NOW,
                end_time=NOW + timedelta(hours=1),
            ),
        ],
        dependencies=[],
        evidence=[],
    )

    proposal = generate_repair(
        commitment,
        build_dependency(),
        2.3,
        ["SEG-3"],
    )

    assert proposal.affected_segments == ["SEG-3"]

    assert proposal.preserved_segments == ["SEG-1"]

    assert proposal.status.value == "PROPOSED"


def test_repair_selects_lowest_disruption_option() -> None:
    commitment = MarineCommitment(
        commitment_id="C-MIN",
        stakeholder_type="fisherman",
        decision_type="route",
        decision_summary="minimum disruption test",
        segments=[
            CommitmentSegment(
                segment_id="SEG-1",
                label="departure",
                start_time=NOW,
                end_time=NOW + timedelta(hours=1),
            ),
            CommitmentSegment(
                segment_id="SEG-2",
                label="fishing",
                start_time=NOW + timedelta(hours=1),
                end_time=NOW + timedelta(hours=3),
            ),
            CommitmentSegment(
                segment_id="SEG-3",
                label="return",
                start_time=NOW + timedelta(hours=3),
                end_time=NOW + timedelta(hours=4),
            ),
        ],
        dependencies=[],
        evidence=[],
    )

    proposal = generate_repair(
        commitment,
        build_dependency("D-MIN"),
        2.3,
        ["SEG-3"],
    )

    assert proposal.options

    lowest_score = min(
        option.disruption_score
        for option in proposal.options
    )

    assert proposal.disruption_score == lowest_score

    selected = next(
        option
        for option in proposal.options
        if option.option_id == proposal.selected_option
    )

    assert selected.disruption_score == lowest_score

    assert proposal.selected_option == "OPT-TIME-1"