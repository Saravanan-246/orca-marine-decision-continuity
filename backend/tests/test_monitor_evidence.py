from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app
from src.models.commitment import CommitmentSegment, MarineCommitment
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)
from src.models.evidence import Evidence
from src.models.marine import DataStatus
from src.services.commitment_service import create_commitment, get_commitment
from src.services.monitor_service import reevaluate_commitment


client = TestClient(app)

NOW = datetime(2026, 9, 6, 12, 0, tzinfo=timezone.utc)


def _evidence(
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


def _seed_commitment(
    *,
    extra_dependencies: list[DecisionDependency] | None = None,
    extra_evidence: list[Evidence] | None = None,
) -> MarineCommitment:
    commitment_id = f"C-MON-{uuid4().hex[:10]}"

    dependencies = [
        DecisionDependency(
            dependency_id="D-WAVE",
            parameter="wave_height",
            source="buoy-a",
            value_at_commit=1.4,
            valid_range=ValueRange(min=0, max=2, risk_margin=0.1),
            temporal_resolution_h=1,
            observed_at=NOW,
            current_value=1.4,
            segment_ids=["SEG-3"],
        )
    ]
    evidence = [
        _evidence(value=1.4),
    ]

    if extra_dependencies:
        dependencies.extend(extra_dependencies)
    if extra_evidence:
        evidence.extend(extra_evidence)

    return create_commitment(
        MarineCommitment(
            commitment_id=commitment_id,
            stakeholder_type="FISHERMAN",
            decision_type="FISHING_TRIP",
            decision_summary="monitor evidence fixture",
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
    )


def _status(result: dict) -> str:
    value = result["results"][0]["status"]
    return value.value if hasattr(value, "value") else value


def test_monitor_fresh_valid_evidence() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[_evidence(value=1.4)],
        as_of=NOW,
    )

    assert _status(result) == "VALID"
    assert result["state"].value == "VALID"
    assert result["results"][0]["evidence_id"] == "E1"
    assert result["results"][0]["source"] == "buoy-a"
    assert result["results"][0]["freshness_hours"] == 0
    assert "within valid range" in result["results"][0]["reason"]


def test_monitor_fresh_threshold_violation() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[_evidence(value=2.3)],
        as_of=NOW,
    )

    assert _status(result) == "VIOLATED"
    assert result["state"].value == "VIOLATED"
    assert result["results"][0]["current_value"] == 2.3
    assert "exceeded valid range bound" in result["results"][0]["reason"]


def test_monitor_stale_evidence_is_unverifiable() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[
            _evidence(timestamp=NOW - timedelta(hours=3))
        ],
        as_of=NOW,
    )

    assert _status(result) == "UNVERIFIABLE"
    assert result["state"].value == "UNVERIFIABLE"
    assert "stale" in result["results"][0]["reason"]
    assert result["results"][0]["freshness_hours"] == 3


def test_monitor_missing_evidence_is_unverifiable() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[],
        as_of=NOW,
    )

    assert _status(result) == "UNVERIFIABLE"
    assert "no evidence available" in result["results"][0]["reason"]


def test_monitor_invalid_evidence_is_unverifiable() -> None:
    commitment = _seed_commitment()

    unknown = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[
            _evidence(data_status=DataStatus.UNKNOWN)
        ],
        as_of=NOW,
    )
    non_numeric = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[_evidence(value="rough")],
        as_of=NOW,
    )

    assert _status(unknown) == "UNVERIFIABLE"
    assert _status(non_numeric) == "UNVERIFIABLE"
    assert "not usable" in unknown["results"][0]["reason"]
    assert "not usable" in non_numeric["results"][0]["reason"]


def test_monitor_conflicting_evidence_is_unverifiable() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[
            _evidence(evidence_id="E1", value=1.1),
            _evidence(evidence_id="E2", value=1.8),
        ],
        as_of=NOW,
    )

    assert _status(result) == "UNVERIFIABLE"
    assert "conflicting evidence" in result["results"][0]["reason"]


def test_monitor_multiple_dependencies_each_evaluated() -> None:
    commitment = _seed_commitment(
        extra_dependencies=[
            DecisionDependency(
                dependency_id="D-WIND",
                parameter="wind_speed",
                source="anemometer",
                value_at_commit=8.0,
                valid_range=ValueRange(min=0, max=20, risk_margin=0.1),
                temporal_resolution_h=1,
                observed_at=NOW,
                current_value=8.0,
                segment_ids=["SEG-3"],
            )
        ],
        extra_evidence=[
            _evidence(
                evidence_id="E-WIND",
                parameter="wind_speed",
                source="anemometer",
                value=8.0,
            )
        ],
    )

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[
            _evidence(value=2.4),
            _evidence(
                evidence_id="E-WIND",
                parameter="wind_speed",
                source="anemometer",
                value=8.0,
            ),
        ],
        as_of=NOW,
    )

    by_id = {
        item["dependency_id"]: item
        for item in result["results"]
    }

    assert by_id["D-WAVE"]["status"] == DependencyStatus.VIOLATED
    assert by_id["D-WIND"]["status"] == DependencyStatus.VALID
    assert result["state"].value == "VIOLATED"


def test_monitor_recovery_to_valid_with_fresh_evidence() -> None:
    commitment = _seed_commitment()

    stale = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[
            _evidence(timestamp=NOW - timedelta(hours=4))
        ],
        as_of=NOW,
    )
    recovered = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[_evidence(value=1.3)],
        as_of=NOW,
    )

    assert _status(stale) == "UNVERIFIABLE"
    assert stale["state"].value == "UNVERIFIABLE"
    assert _status(recovered) == "VALID"
    assert recovered["state"].value == "VALID"

    stored = get_commitment(commitment.commitment_id)
    assert stored.dependencies[0].status == DependencyStatus.VALID
    assert stored.dependencies[0].current_value == 1.3


def test_monitor_does_not_mutate_during_evaluation() -> None:
    commitment = _seed_commitment()
    before = get_commitment(commitment.commitment_id)
    before_status = before.dependencies[0].status
    before_value = before.dependencies[0].current_value
    before_version = before.version

    result = reevaluate_commitment(
        commitment.commitment_id,
        evidence=[_evidence(value=1.4)],
        as_of=NOW,
    )

    assert _status(result) == "VALID"
    stored = get_commitment(commitment.commitment_id)
    assert stored.dependencies[0].status == before_status
    assert stored.dependencies[0].current_value == before_value
    assert stored.version == before_version


def test_monitor_api_accepts_evidence_payload() -> None:
    commitment = _seed_commitment()
    observed_at = datetime.now(timezone.utc).replace(microsecond=0)

    response = client.post(
        f"/commitments/{commitment.commitment_id}/reevaluate",
        json={
            "evidence": [
                {
                    "evidence_id": "E-API",
                    "parameter": "wave_height",
                    "source": "buoy-a",
                    "value": 1.92,
                    "unit": "m",
                    "timestamp": observed_at.isoformat(),
                    "data_status": "REAL",
                    "temporal_resolution_h": 1,
                }
            ]
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["status"] == "AT_RISK"
    assert payload["results"][0]["evidence_id"] == "E-API"
    assert payload["state"] == "AT_RISK"


def test_monitor_legacy_parameter_map_still_works() -> None:
    commitment = _seed_commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"wave_height": 2.3},
        as_of=NOW,
    )

    assert _status(result) == "VIOLATED"
    assert result["state"].value == "VIOLATED"
