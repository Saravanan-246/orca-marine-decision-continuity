from datetime import datetime, timedelta, timezone
from uuid import uuid4

from src.models.commitment import CommitmentSegment, MarineCommitment
from src.models.dependency import DecisionDependency, ValueRange
from src.models.evidence import Evidence
from src.models.marine import DataStatus, MarineState, MarineValue
from src.services.commitment_service import create_commitment
from src.services.marine_evidence import (
    evidence_from_latest_marine_state,
    evidence_from_marine_state,
)
from src.services.monitor_service import reevaluate_commitment


NOW = datetime(2026, 9, 6, 18, 0, tzinfo=timezone.utc)
INCOIS = "INCOIS-OSF-WW3"


def _marine_value(
    value: object,
    *,
    unit: str,
    status: DataStatus,
    source: str | None = INCOIS,
) -> MarineValue:
    return MarineValue(
        value=value,
        unit=unit,
        data_status=status,
        source=source,
    )


def _marine_state(
    *,
    wave: MarineValue | None = None,
    wind: MarineValue | None = None,
    status: DataStatus = DataStatus.REAL,
    state_id: str | None = None,
) -> MarineState:
    return MarineState(
        state_id=state_id or f"OSF-MON-{uuid4().hex[:10]}",
        location={"lat": 15.0, "lon": 70.0, "dataset": "osf/ww3/rsmc_combined_ww3_20260905.nc"},
        timestamp=NOW,
        wind=wind or MarineValue(),
        wave=wave or MarineValue(),
        sources=[INCOIS] if status is DataStatus.REAL else [f"{INCOIS}-UNAVAILABLE"],
        freshness=(
            "forecast_valid=2026-09-06T18:00:00+00:00;"
            "dataset=osf/ww3/rsmc_combined_ww3_20260905.nc;"
            "temporal_resolution_h=3.0"
        ),
        data_status=status,
        last_updated_at=NOW,
    )


def _commitment(
    *,
    extra_dependencies: list[DecisionDependency] | None = None,
) -> MarineCommitment:
    dependencies = [
        DecisionDependency(
            dependency_id="D-WAVE",
            parameter="wave_height",
            source=INCOIS,
            value_at_commit=1.4,
            valid_range=ValueRange(min=0, max=2, risk_margin=0.1),
            temporal_resolution_h=3,
            observed_at=NOW,
            current_value=1.4,
            segment_ids=["SEG-3"],
        )
    ]
    if extra_dependencies:
        dependencies.extend(extra_dependencies)

    return create_commitment(
        MarineCommitment(
            commitment_id=f"C-OSF-{uuid4().hex[:10]}",
            stakeholder_type="FISHERMAN",
            decision_type="FISHING_TRIP",
            decision_summary="marine state monitor fixture",
            segments=[
                CommitmentSegment(
                    segment_id="SEG-3",
                    label="Return",
                    start_time=NOW,
                    end_time=NOW + timedelta(hours=1),
                )
            ],
            dependencies=dependencies,
            evidence=[],
            created_at=NOW,
            updated_at=NOW,
            last_updated_at=NOW,
        )
    )


def _status(result: dict, index: int = 0) -> str:
    value = result["results"][index]["status"]
    return value.value if hasattr(value, "value") else value


def test_real_wave_evidence_conversion() -> None:
    state = _marine_state(
        wave=_marine_value(1.5938, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.3, unit="m/s", status=DataStatus.REAL),
    )

    items = evidence_from_marine_state(state)
    wave = next(item for item in items if item.parameter == "wave_height")

    assert wave.value == 1.5938
    assert wave.unit == "m"
    assert wave.source == INCOIS
    assert wave.data_status is DataStatus.REAL
    assert wave.timestamp == NOW
    assert wave.location is not None
    assert wave.location["freshness"] == state.freshness
    assert wave.location["last_updated_at"] == NOW.isoformat()
    assert wave.location["state_id"] == state.state_id


def test_real_wind_evidence_conversion() -> None:
    state = _marine_state(
        wave=_marine_value(1.5, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.306, unit="m/s", status=DataStatus.REAL),
    )

    items = evidence_from_marine_state(state)
    wind = next(item for item in items if item.parameter == "wind_speed")

    assert wind.value == 6.306
    assert wind.unit == "m/s"
    assert wind.source == INCOIS
    assert wind.data_status is DataStatus.REAL
    assert wind.timestamp == NOW


def test_no_marine_state_yields_no_evidence(monkeypatch) -> None:
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: None,
    )
    assert evidence_from_latest_marine_state() == []


def test_unknown_marine_state_is_not_converted() -> None:
    state = _marine_state(
        wave=_marine_value(None, unit="m", status=DataStatus.UNKNOWN, source=f"{INCOIS}-UNAVAILABLE"),
        wind=_marine_value(None, unit="m/s", status=DataStatus.UNKNOWN, source=f"{INCOIS}-UNAVAILABLE"),
        status=DataStatus.UNKNOWN,
    )

    assert evidence_from_marine_state(state) == []


def test_simulated_marine_values_are_not_used_as_real() -> None:
    state = _marine_state(
        wave=_marine_value(2.3, unit="m", status=DataStatus.SIMULATED, source="ORCA-UI"),
        wind=_marine_value(9.0, unit="m/s", status=DataStatus.SIMULATED, source="ORCA-UI"),
        status=DataStatus.SIMULATED,
    )

    assert evidence_from_marine_state(state) == []


def test_real_marine_evidence_reaches_dependency_evaluation(monkeypatch) -> None:
    state = _marine_state(
        wave=_marine_value(1.59, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.3, unit="m/s", status=DataStatus.REAL),
    )
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: state,
    )
    commitment = _commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"use_latest_marine_state": True},
        as_of=NOW,
    )

    assert _status(result) == "VALID"
    row = result["results"][0]
    assert row["current_value"] == 1.59
    assert row["source"] == INCOIS
    assert row["data_status"] is DataStatus.REAL
    assert row["evidence_id"] == f"E-{state.state_id}-wave_height"
    assert row["affected_segments"] == ["SEG-3"]


def test_real_marine_violation_uses_commitment_range(monkeypatch) -> None:
    state = _marine_state(
        wave=_marine_value(2.4, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.3, unit="m/s", status=DataStatus.REAL),
    )
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: state,
    )
    commitment = _commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"use_latest_marine_state": True},
        as_of=NOW,
    )

    assert _status(result) == "VIOLATED"
    assert result["results"][0]["current_value"] == 2.4
    isolation = result["segment_isolation"]
    assert "SEG-3" in isolation["affected_segment_ids"]
    assert result["impact_analysis"]["could_not_evaluate"] is False


def test_missing_marine_state_is_unverifiable(monkeypatch) -> None:
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: None,
    )
    commitment = _commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"use_latest_marine_state": True},
        as_of=NOW,
    )

    assert _status(result) == "UNVERIFIABLE"
    assert result["results"][0]["current_value"] is None
    assert "no evidence available" in result["results"][0]["reason"]


def test_simulated_evidence_path_still_works() -> None:
    commitment = _commitment()
    evidence = [
        Evidence(
            evidence_id="E-SIM",
            parameter="wave_height",
            source=INCOIS,
            value=2.3,
            unit="m",
            timestamp=NOW,
            data_status=DataStatus.SIMULATED,
            temporal_resolution_h=3,
        )
    ]

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"evidence": evidence},
        as_of=NOW,
    )

    assert _status(result) == "VIOLATED"
    assert result["results"][0]["data_status"] is DataStatus.SIMULATED
    assert result["results"][0]["current_value"] == 2.3


def test_explicit_evidence_wins_over_marine_flag() -> None:
    commitment = _commitment()

    result = reevaluate_commitment(
        commitment.commitment_id,
        {
            "use_latest_marine_state": True,
            "evidence": [
                Evidence(
                    evidence_id="E-SIM",
                    parameter="wave_height",
                    source=INCOIS,
                    value=2.3,
                    unit="m",
                    timestamp=NOW,
                    data_status=DataStatus.SIMULATED,
                    temporal_resolution_h=3,
                )
            ],
        },
        as_of=NOW,
    )

    assert result["results"][0]["current_value"] == 2.3
    assert result["results"][0]["data_status"] is DataStatus.SIMULATED


def test_real_wind_dependency_uses_marine_wind(monkeypatch) -> None:
    state = _marine_state(
        wave=_marine_value(1.4, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.3, unit="m/s", status=DataStatus.REAL),
    )
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: state,
    )
    commitment = _commitment(
        extra_dependencies=[
            DecisionDependency(
                dependency_id="D-WIND",
                parameter="wind_speed",
                source=INCOIS,
                value_at_commit=5.0,
                valid_range=ValueRange(min=0, max=15, risk_margin=0.1),
                temporal_resolution_h=3,
                observed_at=NOW,
                current_value=5.0,
                segment_ids=["SEG-3"],
            )
        ]
    )

    result = reevaluate_commitment(
        commitment.commitment_id,
        {"use_latest_marine_state": True},
        as_of=NOW,
    )

    wind = next(
        item for item in result["results"] if item["dependency_id"] == "D-WIND"
    )
    assert (wind["status"].value if hasattr(wind["status"], "value") else wind["status"]) == "VALID"
    assert wind["current_value"] == 6.3
    assert wind["source"] == INCOIS
    assert wind["data_status"] is DataStatus.REAL


def test_monitor_api_use_latest_marine_state_flag(monkeypatch) -> None:
    from fastapi.testclient import TestClient

    from src.main import app

    state = _marine_state(
        wave=_marine_value(1.59, unit="m", status=DataStatus.REAL),
        wind=_marine_value(6.3, unit="m/s", status=DataStatus.REAL),
    )
    monkeypatch.setattr(
        "src.services.marine_evidence.latest_state_or_none",
        lambda: state,
    )
    commitment = _commitment()
    client = TestClient(app)

    response = client.post(
        f"/commitments/{commitment.commitment_id}/reevaluate",
        json={"use_latest_marine_state": True},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["current_value"] == 1.59
    assert payload["results"][0]["source"] == INCOIS
    assert payload["results"][0]["data_status"] == "REAL"
