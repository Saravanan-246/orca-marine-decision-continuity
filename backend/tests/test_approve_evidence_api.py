from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def _observed_at() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _prepare_proposed_repair() -> dict[str, str]:
    commitment_id = f"C-APV-{uuid4().hex[:10]}"
    dependency_id = f"DEP-WAVE-{uuid4().hex[:10]}"
    observed_at = _observed_at()

    create_payload = {
        "stakeholder_type": "FISHERMAN",
        "decision_type": "FISHING_TRIP",
        "decision_summary": "approve evidence API fixture",
        "commitment_id": commitment_id,
        "segments": [
            {
                "segment_id": "SEG-1",
                "label": "Departure",
                "start_time": "2026-09-04T09:00:00Z",
                "end_time": "2026-09-04T10:00:00Z",
                "required_conditions": {},
            },
            {
                "segment_id": "SEG-3",
                "label": "Return",
                "start_time": "2026-09-04T12:00:00Z",
                "end_time": "2026-09-04T13:00:00Z",
                "required_conditions": {},
            },
        ],
        "dependencies": [
            {
                "dependency_id": dependency_id,
                "parameter": "wave_height",
                "source": "ORCA-API",
                "value_at_commit": 1.4,
                "valid_range": {
                    "min": 0,
                    "max": 2.0,
                    "risk_margin": 0.1,
                },
                "temporal_resolution_h": 1,
                "observed_at": observed_at,
                "current_value": 1.4,
                "status": "VALID",
                "segment_ids": ["SEG-3"],
            }
        ],
        "evidence": [
            {
                "evidence_id": f"EVD-{uuid4().hex[:8]}",
                "parameter": "wave_height",
                "source": "ORCA-API",
                "value": 1.4,
                "unit": "m",
                "timestamp": observed_at,
                "temporal_resolution_h": 1,
                "data_status": "SIMULATED",
            }
        ],
        "state": "VALID",
        "version": 1,
    }

    created = client.post("/commitments", json=create_payload)
    assert created.status_code == 200

    violated = client.post(
        f"/commitments/{commitment_id}/reevaluate",
        json={"wave_height": 2.3},
    )
    assert violated.status_code == 200
    assert violated.json()["state"] == "VIOLATED"

    repair = client.post(
        f"/commitments/{commitment_id}/repair",
        json={
            "dependency_id": dependency_id,
            "current_value": 2.3,
            "affected_segments": ["SEG-3"],
        },
    )
    assert repair.status_code == 200
    assert repair.json()["status"] == "PROPOSED"

    return {
        "commitment_id": commitment_id,
        "dependency_id": dependency_id,
        "repair_id": repair.json()["repair_id"],
    }


def _wave_evidence(
    value: object,
    *,
    timestamp: str | None = None,
    data_status: str = "REAL",
) -> dict:
    return {
        "evidence_id": f"E-{uuid4().hex[:8]}",
        "parameter": "wave_height",
        "source": "ORCA-API",
        "value": value,
        "unit": "m",
        "timestamp": timestamp or _observed_at(),
        "temporal_resolution_h": 1,
        "data_status": data_status,
    }


def test_approve_with_fresh_evidence() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={"evidence": [_wave_evidence(1.95)]},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "AT_RISK"
    assert commitment["dependencies"][0]["status"] == "AT_RISK"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )
    assert commitment["segments"][0]["start_time"] == (
        "2026-09-04T09:00:00Z"
    )


def test_approve_without_evidence_uses_stored_evidence() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "VALID"
    assert commitment["dependencies"][0]["status"] == "VALID"


def test_approve_with_invalid_evidence_returns_422() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={
            "evidence": [
                {
                    "evidence_id": "E-BAD",
                    "value": 1.4,
                }
            ]
        },
    )

    assert response.status_code == 422

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "VIOLATED"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T12:00:00Z"
    )


def test_approve_with_stale_evidence_is_unverifiable() -> None:
    ids = _prepare_proposed_repair()
    stale = (
        datetime.now(timezone.utc) - timedelta(hours=3)
    ).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={"evidence": [_wave_evidence(1.4, timestamp=stale)]},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "UNVERIFIABLE"
    assert commitment["dependencies"][0]["status"] == "UNVERIFIABLE"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )


def test_reject_with_evidence_does_not_mutate() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/reject",
        json={"evidence": [_wave_evidence(1.4)]},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "VIOLATED"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T12:00:00Z"
    )


def test_repeated_approval_does_not_apply_twice() -> None:
    ids = _prepare_proposed_repair()
    first = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={"evidence": [_wave_evidence(1.4)]},
    )
    assert first.status_code == 200

    after_first = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert after_first["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )

    second = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={"evidence": [_wave_evidence(1.4)]},
    )
    assert second.status_code == 200
    assert second.json()["status"] == "APPROVED"

    after_second = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert after_second["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )
    assert after_second["state"] == after_first["state"]


def test_approve_with_conflicting_evidence_is_unverifiable() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={
            "evidence": [
                _wave_evidence(1.1),
                _wave_evidence(1.8),
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "UNVERIFIABLE"
    assert commitment["dependencies"][0]["status"] == "UNVERIFIABLE"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )


def test_approve_with_missing_evidence_list_is_unverifiable() -> None:
    ids = _prepare_proposed_repair()

    response = client.post(
        f"/repairs/{ids['repair_id']}/approve",
        json={"evidence": []},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    commitment = client.get(
        f"/commitments/{ids['commitment_id']}"
    ).json()
    assert commitment["state"] == "UNVERIFIABLE"
    assert commitment["dependencies"][0]["status"] == "UNVERIFIABLE"
    assert commitment["segments"][1]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )
