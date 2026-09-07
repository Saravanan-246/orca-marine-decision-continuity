from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

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
from src.models.repair import RepairOption, RepairProposal, RepairStatus
from src.models.marine import DataStatus
from src.models.evidence import Evidence
from src.services.commitment_service import create_commitment, get_commitment
from src.services.repair_service import (
    _save_repair,
    propose_ranked,
    rank_candidates,
    generate_candidates,
    set_status,
)


NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def _seed_violated() -> MarineCommitment:
    commitment_id = f"C-APR-{uuid4().hex[:10]}"
    return create_commitment(
        MarineCommitment(
            commitment_id=commitment_id,
            stakeholder_type="FISHERMAN",
            decision_type="FISHING_TRIP",
            decision_summary="approval fixture",
            segments=[
                CommitmentSegment(
                    segment_id="SEG-1",
                    label="Departure",
                    start_time=NOW,
                    end_time=NOW + timedelta(hours=1),
                ),
                CommitmentSegment(
                    segment_id="SEG-3",
                    label="Return",
                    start_time=NOW + timedelta(hours=2),
                    end_time=NOW + timedelta(hours=3),
                ),
            ],
            dependencies=[
                DecisionDependency(
                    dependency_id="DEP-C",
                    parameter="wave_height",
                    source="test",
                    value_at_commit=1.4,
                    valid_range=ValueRange(min=0, max=2),
                    temporal_resolution_h=1,
                    observed_at=NOW,
                    current_value=2.3,
                    segment_ids=["SEG-3"],
                )
            ],
            evidence=[],
            state=CommitmentState.DRAFT,
            created_at=NOW,
            updated_at=NOW,
            last_updated_at=NOW,
        )
    )


def _force_violated(commitment: MarineCommitment) -> MarineCommitment:
    stored = get_commitment(commitment.commitment_id)
    stored.state = CommitmentState.VIOLATED
    from src.core.database import db
    from src.services.repository_helpers import replace_one

    replace_one(
        db.collection("commitments"),
        {"commitment_id": stored.commitment_id},
        {
            "_id": stored.commitment_id,
            **stored.model_dump(mode="json"),
        },
    )
    return get_commitment(commitment.commitment_id)


def _ranked_proposal() -> tuple[MarineCommitment, RepairProposal]:
    commitment = _force_violated(_seed_violated())
    evaluations = [
        Evaluation(
            status=DependencyStatus.VIOLATED,
            reason="wave_height is VIOLATED",
            affected_segments=["SEG-3"],
            dependency_id="DEP-C",
            source="test",
            current_value=2.3,
        )
    ]
    ranking = rank_candidates(
        generate_candidates(
            commitment,
            evaluations=evaluations,
        )
    )
    proposal = propose_ranked(
        commitment,
        ranking,
        triggering_dependency_id="DEP-C",
    )
    return get_commitment(commitment.commitment_id), proposal


def _wave_evidence(value: object = 1.4) -> list[Evidence]:
    return [
        Evidence(
            evidence_id="E-WAVE",
            parameter="wave_height",
            source="test",
            value=value,
            unit="m",
            timestamp=NOW,
            data_status=DataStatus.REAL,
            temporal_resolution_h=1,
        )
    ]


def test_ranked_repair_stays_proposed_until_approval() -> None:
    commitment, proposal = _ranked_proposal()

    assert proposal.status == RepairStatus.PROPOSED
    assert proposal.requires_human_approval is True
    stored = get_commitment(commitment.commitment_id)
    assert stored.state == CommitmentState.VIOLATED
    assert stored.segments[1].start_time == NOW + timedelta(hours=2)


def test_valid_approval_applies_selected_repair_only() -> None:
    commitment, proposal = _ranked_proposal()
    before = deepcopy(get_commitment(commitment.commitment_id))

    approved = set_status(
        proposal.repair_id,
        RepairStatus.APPROVED,
        evidence=_wave_evidence(1.4),
        as_of=NOW,
    )

    assert approved.status == RepairStatus.APPROVED
    updated = get_commitment(commitment.commitment_id)
    assert updated.state == CommitmentState.VALID
    assert approved.selected_option == "OPT-TIME-1"
    shifted = next(
        item
        for item in updated.segments
        if item.segment_id == "SEG-3"
    )
    original = next(
        item
        for item in before.segments
        if item.segment_id == "SEG-3"
    )
    assert shifted.start_time == original.start_time + timedelta(hours=2)
    assert shifted.end_time == original.end_time + timedelta(hours=2)


def test_rejection_leaves_commitment_unchanged() -> None:
    commitment, proposal = _ranked_proposal()
    snapshot = deepcopy(get_commitment(commitment.commitment_id).model_dump())

    rejected = set_status(proposal.repair_id, RepairStatus.REJECTED)

    assert rejected.status == RepairStatus.REJECTED
    stored = get_commitment(commitment.commitment_id)
    assert stored.model_dump() == snapshot
    assert stored.state == CommitmentState.VIOLATED


def test_already_approved_does_not_double_apply() -> None:
    commitment, proposal = _ranked_proposal()
    set_status(
        proposal.repair_id,
        RepairStatus.APPROVED,
        evidence=_wave_evidence(1.4),
        as_of=NOW,
    )
    after_first = deepcopy(get_commitment(commitment.commitment_id).model_dump())

    again = set_status(proposal.repair_id, RepairStatus.APPROVED)

    assert again.status == RepairStatus.APPROVED
    assert get_commitment(commitment.commitment_id).model_dump() == after_first


def test_already_rejected_cannot_be_approved() -> None:
    commitment, proposal = _ranked_proposal()
    snapshot = deepcopy(get_commitment(commitment.commitment_id).model_dump())
    set_status(proposal.repair_id, RepairStatus.REJECTED)

    with pytest.raises(ValueError, match="cannot transition"):
        set_status(proposal.repair_id, RepairStatus.APPROVED)

    assert get_commitment(commitment.commitment_id).model_dump() == snapshot


def test_missing_repair() -> None:
    with pytest.raises(ValueError, match="repair not found"):
        set_status("RP-MISSING", RepairStatus.APPROVED)


def test_commitment_not_found() -> None:
    proposal = RepairProposal(
        repair_id=f"RP-ORPHAN-{uuid4().hex[:8]}",
        commitment_id="C-DOES-NOT-EXIST",
        violated_dependency_id="DEP-C",
        affected_segments=["SEG-3"],
        preserved_segments=["SEG-1"],
        options=[
            RepairOption(
                option_id="OPT-TIME-1",
                repair_type="TIME_SHIFT",
                affected_segments=["SEG-3"],
                changes={"shift_hours": 2.0},
                disruption_score=1.0,
                reason="test",
            )
        ],
        selected_option="OPT-TIME-1",
        disruption_score=1.0,
        reason="orphan proposal",
        requires_human_approval=True,
        status=RepairStatus.PROPOSED,
    )
    _save_repair(proposal)

    with pytest.raises(ValueError, match="commitment not found"):
        set_status(proposal.repair_id, RepairStatus.APPROVED)


def test_invalid_repair_is_not_applied() -> None:
    commitment = _force_violated(_seed_violated())
    snapshot = deepcopy(commitment.model_dump())
    proposal = RepairProposal(
        repair_id=f"RP-INVALID-{uuid4().hex[:8]}",
        commitment_id=commitment.commitment_id,
        violated_dependency_id="DEP-C",
        affected_segments=["SEG-3"],
        preserved_segments=["SEG-1"],
        options=[
            RepairOption(
                option_id="OPT-TIME-1",
                repair_type="TIME_SHIFT",
                affected_segments=["SEG-3"],
                changes={"shift_hours": 2.0},
                disruption_score=1.0,
                reason="valid looking option",
            )
        ],
        selected_option="OPT-NOT-PRESENT",
        disruption_score=1.0,
        reason="invalid selected option",
        requires_human_approval=True,
        status=RepairStatus.PROPOSED,
    )
    _save_repair(proposal)

    with pytest.raises(ValueError, match="invalid repair"):
        set_status(proposal.repair_id, RepairStatus.APPROVED)

    stored = get_commitment(commitment.commitment_id)
    assert stored.state == CommitmentState.VIOLATED
    assert stored.segments[0].model_dump() == snapshot["segments"][0]
    assert stored.segments[1].start_time == commitment.segments[1].start_time


def test_unaffected_segments_remain_unchanged_after_approval() -> None:
    commitment, proposal = _ranked_proposal()
    before = deepcopy(get_commitment(commitment.commitment_id))
    untouched = next(
        item
        for item in before.segments
        if item.segment_id == "SEG-1"
    )

    set_status(
        proposal.repair_id,
        RepairStatus.APPROVED,
        evidence=_wave_evidence(1.4),
        as_of=NOW,
    )
    after = get_commitment(commitment.commitment_id)
    still = next(
        item
        for item in after.segments
        if item.segment_id == "SEG-1"
    )
    assert still.model_dump() == untouched.model_dump()
