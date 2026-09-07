from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def test_full_orca_commitment_violation_repair_flow() -> None:
    commitment_id = f"C-E2E-{uuid4().hex[:10]}"
    dependency_id = f"DEP-WAVE-{uuid4().hex[:10]}"
    evidence_id = f"EVD-WAVE-{uuid4().hex[:10]}"

    observed_at = datetime.now(timezone.utc).replace(
        microsecond=0
    ).isoformat().replace("+00:00", "Z")

    create_payload = {
        "stakeholder_type": "FISHERMAN",
        "decision_type": "FISHING_TRIP",
        "decision_summary": "E2E fishing trip",
        "spatial_scope": {
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [80.20, 13.00],
                        [80.35, 13.00],
                        [80.35, 13.15],
                        [80.20, 13.15],
                        [80.20, 13.00],
                    ]
                ],
            }
        },
        "temporal_scope": {
            "start": "2026-09-04T09:00:00Z",
            "end": "2026-09-04T13:00:00Z",
        },
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
                "segment_id": "SEG-2",
                "label": "Fishing",
                "start_time": "2026-09-04T10:00:00Z",
                "end_time": "2026-09-04T12:00:00Z",
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
                "source": "ORCA-E2E",
                "value_at_commit": 1.4,
                "valid_range": {
                    "min": 0,
                    "max": 2.0,
                    "risk_margin": 0.1,
                },
                "location": {
                    "lat": 13.08,
                    "lon": 80.28,
                },
                "spatial_resolution_km": 1,
                "temporal_resolution_h": 1,
                "observed_at": observed_at,
                "current_value": 1.4,
                "status": "VALID",
                "segment_ids": ["SEG-3"],
            }
        ],
        "evidence": [
            {
                "evidence_id": evidence_id,
                "parameter": "wave_height",
                "source": "ORCA-E2E",
                "value": 1.4,
                "unit": "m",
                "timestamp": observed_at,
                "location": {
                    "lat": 13.08,
                    "lon": 80.28,
                },
                "spatial_resolution_km": 1,
                "temporal_resolution_h": 1,
                "data_status": "SIMULATED",
            }
        ],
        "state": "VALID",
        "version": 1,
    }

    create_response = client.post(
        "/commitments",
        json=create_payload,
    )

    assert create_response.status_code == 200

    created = create_response.json()

    assert created["commitment_id"] == commitment_id
    assert created["state"] == "VALID"

    reevaluate_response = client.post(
        f"/commitments/{commitment_id}/reevaluate",
        json={"wave_height": 2.3},
    )

    assert reevaluate_response.status_code == 200

    reevaluated = reevaluate_response.json()

    assert reevaluated["state"] == "VIOLATED"

    result = reevaluated["results"][0]

    assert result["dependency_id"] == dependency_id
    assert result["status"] == "VIOLATED"
    assert result["affected_segments"] == ["SEG-3"]

    repair_response = client.post(
        f"/commitments/{commitment_id}/repair",
        json={
            "dependency_id": dependency_id,
            "current_value": 2.3,
            "affected_segments": ["SEG-3"],
        },
    )

    assert repair_response.status_code == 200

    repair = repair_response.json()

    assert repair["commitment_id"] == commitment_id
    assert repair["violated_dependency_id"] == dependency_id
    assert repair["affected_segments"] == ["SEG-3"]
    assert repair["preserved_segments"] == ["SEG-1", "SEG-2"]
    assert repair["status"] == "PROPOSED"

    repair_id = repair["repair_id"]

    approve_response = client.post(
        f"/repairs/{repair_id}/approve",
    )

    assert approve_response.status_code == 200

    approved = approve_response.json()

    assert approved["repair_id"] == repair_id
    assert approved["status"] == "APPROVED"

    final_response = client.get(
        f"/commitments/{commitment_id}",
    )

    assert final_response.status_code == 200

    final_commitment = final_response.json()

    assert final_commitment["commitment_id"] == commitment_id
    assert final_commitment["state"] == "VALID"
    assert final_commitment["dependencies"][0]["status"] == "VALID"

    segments = {
        segment["segment_id"]: segment
        for segment in final_commitment["segments"]
    }

    assert segments["SEG-1"]["start_time"] == (
        "2026-09-04T09:00:00Z"
    )

    assert segments["SEG-2"]["start_time"] == (
        "2026-09-04T10:00:00Z"
    )

    assert segments["SEG-3"]["start_time"] == (
        "2026-09-04T14:00:00Z"
    )