from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

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
from src.models.evidence import Evidence
from src.models.marine import DataStatus
from src.models.repair import RepairStatus
from src.services.commitment_service import create_commitment, get_commitment
from src.services.monitor_service import reevaluate_commitment
from src.services.repair_service import (
    generate_candidates,
    propose_ranked,
    rank_candidates,
    set_status,
)


NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def _evidence(
    *,
    evidence_id: str,
    parameter: str,
    source: str,
    value: object,
    data_status: DataStatus = DataStatus.REAL,
    timestamp: datetime | None = None,
) -> Evidence:
    return Evidence(
        evidence_id=evidence_id,
        parameter=parameter,
        source=source,
        value=value,
        unit="m",
        timestamp=timestamp or NOW,
        data_status=data_status,
        temporal_resolution_h=1,
    )


def _seed(*, extra_wind: bool = False) -> MarineCommitment:
    commitment_id = f"C-RM-{uuid4().hex[:10]}"
    dependencies = [
        DecisionDependency(
            dependency_id="DEP-C",
            parameter="wave_height",
            source="buoy-a",
            value_at_commit=1.4,
            valid_range=ValueRange(min=0, max=2, risk_margin=0.1),
            temporal_resolution_h=1,
            observed_at=NOW,
            current_value=2.3,
            segment_ids=["SEG-3"],
        )
    ]
    segments = [
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
    ]
    if extra_wind:
        dependencies.append(
            DecisionDependency(
                dependency_id="DEP-W",
                parameter="wind_speed",
                source="anemometer",
                value_at_commit=8.0,
                valid_range=ValueRange(min=0, max=20, risk_margin=0.1),
                temporal_resolution_h=1,
                observed_at=NOW,
                current_value=8.0,
                segment_ids=["SEG-1"],
            )
        )

    created = create_commitment(
        MarineCommitment(
            commitment_id=commitment_id,
            stakeholder_type="FISHERMAN",
            decision_type="FISHING_TRIP",
            decision_summary="re-monitor fixture",
            segments=segments,
            dependencies=dependencies,
            evidence=[],
            created_at=NOW,
            updated_at=NOW,
            last_updated_at=NOW,
        )
    )
    created.state = CommitmentState.VIOLATED
    from src.core.database import db
    from src.services.repository_helpers import replace_one

    replace_one(
        db.collection("commitments"),
        {"commitment_id": created.commitment_id},
        {
            "_id": created.commitment_id,
            **created.model_dump(mode="json"),
        },
    )
    return get_commitment(created.commitment_id)


def _evaluations(commitment: MarineCommitment) -> list[Evaluation]:
    items = [
        Evaluation(
            status=DependencyStatus.VIOLATED,
            reason="wave_height is VIOLATED",
            affected_segments=["SEG-3"],
            dependency_id="DEP-C",
            source="buoy-a",
            current_value=2.3,
        )
    ]
    if any(item.dependency_id == "DEP-W" for item in commitment.dependencies):
        items.append(
            Evaluation(
                status=DependencyStatus.VALID,
                reason="wind_speed is VALID",
                affected_segments=["SEG-1"],
                dependency_id="DEP-W",
                source="anemometer",
                current_value=8.0,
            )
        )
    return items


def _propose(commitment: MarineCommitment):
    ranking = rank_candidates(
        generate_candidates(
            commitment,
            evaluations=_evaluations(commitment),
        )
    )
    return propose_ranked(
        commitment,
        ranking,
        triggering_dependency_id="DEP-C",
    )


def _approve(proposal, evidence: list[Evidence]):
    return set_status(
        proposal.repair_id,
        RepairStatus.APPROVED,
        evidence=evidence,
        as_of=NOW,
    )


def test_approved_repair_becomes_valid() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    assert get_commitment(commitment.commitment_id).state == (
        CommitmentState.VIOLATED
    )

    _approve(
        proposal,
        [_evidence(evidence_id="E1", parameter="wave_height", source="buoy-a", value=1.4)],
    )

    stored = get_commitment(commitment.commitment_id)
    assert stored.state == CommitmentState.VALID
    assert stored.dependencies[0].status == DependencyStatus.VALID
    assert stored.segments[0].start_time == NOW
    assert stored.segments[1].start_time == NOW + timedelta(hours=4)


def test_still_at_risk_after_repair() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    _approve(
        proposal,
        [_evidence(evidence_id="E1", parameter="wave_height", source="buoy-a", value=1.95)],
    )

    stored = get_commitment(commitment.commitment_id)
    assert stored.dependencies[0].status == DependencyStatus.AT_RISK
    assert stored.state == CommitmentState.AT_RISK


def test_still_violated_after_repair() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    _approve(
        proposal,
        [_evidence(evidence_id="E1", parameter="wave_height", source="buoy-a", value=2.4)],
    )

    stored = get_commitment(commitment.commitment_id)
    assert stored.dependencies[0].status == DependencyStatus.VIOLATED
    assert stored.state == CommitmentState.VIOLATED
    assert stored.segments[1].start_time == NOW + timedelta(hours=4)


def test_unverifiable_after_repair() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    _approve(
        proposal,
        [
            _evidence(
                evidence_id="E1",
                parameter="wave_height",
                source="buoy-a",
                value=1.4,
                data_status=DataStatus.UNKNOWN,
            )
        ],
    )

    stored = get_commitment(commitment.commitment_id)
    assert stored.dependencies[0].status == DependencyStatus.UNVERIFIABLE
    assert stored.state == CommitmentState.UNVERIFIABLE


def test_multiple_dependencies_re_monitored() -> None:
    commitment = _seed(extra_wind=True)
    proposal = _propose(commitment)
    _approve(
        proposal,
        [
            _evidence(evidence_id="E-WAVE", parameter="wave_height", source="buoy-a", value=1.3),
            _evidence(evidence_id="E-WIND", parameter="wind_speed", source="anemometer", value=8.0),
        ],
    )

    stored = get_commitment(commitment.commitment_id)
    by_id = {item.dependency_id: item for item in stored.dependencies}
    assert by_id["DEP-C"].status == DependencyStatus.VALID
    assert by_id["DEP-W"].status == DependencyStatus.VALID
    assert stored.state == CommitmentState.VALID
    assert stored.segments[0].start_time == NOW


def test_repeated_re_monitoring_is_stable() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    evidence = [
        _evidence(evidence_id="E1", parameter="wave_height", source="buoy-a", value=1.4)
    ]
    _approve(proposal, evidence)

    first = reevaluate_commitment(
        commitment.commitment_id,
        evidence=evidence,
        as_of=NOW,
    )
    second = reevaluate_commitment(
        commitment.commitment_id,
        evidence=evidence,
        as_of=NOW,
    )

    assert first["state"] == CommitmentState.VALID
    assert second["state"] == CommitmentState.VALID
    assert first["results"][0]["status"] == DependencyStatus.VALID
    assert second["results"][0]["status"] == DependencyStatus.VALID


def test_repeated_approval_does_not_double_apply_or_remonitor_shift() -> None:
    commitment = _seed()
    proposal = _propose(commitment)
    evidence = [
        _evidence(evidence_id="E1", parameter="wave_height", source="buoy-a", value=1.4)
    ]
    _approve(proposal, evidence)
    after_first = deepcopy(get_commitment(commitment.commitment_id).model_dump())

    set_status(
        proposal.repair_id,
        RepairStatus.APPROVED,
        evidence=evidence,
        as_of=NOW,
    )

    assert get_commitment(commitment.commitment_id).model_dump() == after_first
    assert after_first["segments"][1]["start_time"] != NOW + timedelta(hours=2)


def test_rejected_repair_does_not_remonitor() -> None:
    commitment = _seed()
    snapshot = deepcopy(get_commitment(commitment.commitment_id).model_dump())
    proposal = _propose(commitment)

    set_status(
        proposal.repair_id,
        RepairStatus.REJECTED,
        evidence=[
            _evidence(
                evidence_id="E1",
                parameter="wave_height",
                source="buoy-a",
                value=1.4,
            )
        ],
        as_of=NOW,
    )

    stored = get_commitment(commitment.commitment_id)
    assert stored.model_dump() == snapshot
    assert stored.state == CommitmentState.VIOLATED
    assert stored.segments[1].start_time == NOW + timedelta(hours=2)
