from datetime import datetime, timezone
from uuid import uuid4

from fastapi.testclient import TestClient

from src.main import app


client = TestClient(app)


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def test_orca_core_lifecycle_commitment_to_remonitor() -> None:
    commitment_id = f"C-LIFE-{uuid4().hex[:10]}"
    dependency_id = f"DEP-WAVE-{uuid4().hex[:10]}"
    observed_at = _now_iso()

    created = client.post(
        "/commitments",
        json={
            "stakeholder_type": "FISHERMAN",
            "decision_type": "FISHING_TRIP",
            "decision_summary": "core lifecycle fixture",
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
                    "source": "ORCA-LIFE",
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
                    "source": "ORCA-LIFE",
                    "value": 1.4,
                    "unit": "m",
                    "timestamp": observed_at,
                    "temporal_resolution_h": 1,
                    "data_status": "SIMULATED",
                }
            ],
            "state": "VALID",
            "version": 1,
        },
    )
    assert created.status_code == 200
    created_body = created.json()
    assert created_body["commitment_id"] == commitment_id
    assert created_body["dependencies"]
    assert created_body["state"] == "VALID"

    monitored = client.post(
        f"/commitments/{commitment_id}/reevaluate",
        json={
            "evidence": [
                {
                    "evidence_id": f"EVD-CHG-{uuid4().hex[:8]}",
                    "parameter": "wave_height",
                    "source": "ORCA-LIFE",
                    "value": 2.3,
                    "unit": "m",
                    "timestamp": observed_at,
                    "temporal_resolution_h": 1,
                    "data_status": "SIMULATED",
                }
            ]
        },
    )
    assert monitored.status_code == 200
    monitored_body = monitored.json()
    assert monitored_body["state"] == "VIOLATED"
    assert monitored_body["results"][0]["status"] == "VIOLATED"

    isolation = monitored_body["segment_isolation"]
    impact = monitored_body["impact_analysis"]
    assert isolation["affected_segment_ids"] == ["SEG-3"]
    assert isolation["unaffected_segment_ids"] == ["SEG-1"]
    assert isolation["triggering_dependency_ids"] == [dependency_id]
    assert isolation["deterministic"] is True
    assert impact["operational_impact"] == "VIOLATED"
    assert impact["proposed_commitment_state"] == "VIOLATED"
    assert impact["affected_segment_impacts"][0]["segment_id"] == "SEG-3"

    repair = client.post(
        f"/commitments/{commitment_id}/repair",
        json={
            "dependency_id": dependency_id,
            "current_value": 2.3,
            "affected_segments": isolation["affected_segment_ids"],
        },
    )
    assert repair.status_code == 200
    proposal = repair.json()
    assert proposal["status"] == "PROPOSED"
    assert proposal["requires_human_approval"] is True
    assert proposal["selected_option"] == "OPT-TIME-1"
    assert proposal["affected_segments"] == ["SEG-3"]
    assert proposal["preserved_segments"] == ["SEG-1"]
    assert len(proposal["options"]) >= 2
    scores = [option["disruption_score"] for option in proposal["options"]]
    selected = next(
        option
        for option in proposal["options"]
        if option["option_id"] == proposal["selected_option"]
    )
    assert selected["disruption_score"] == min(scores)

    listed = client.get(f"/commitments/{commitment_id}/repairs")
    assert listed.status_code == 200
    assert listed.json()[0]["repair_id"] == proposal["repair_id"]

    before_approval = client.get(f"/commitments/{commitment_id}").json()
    assert before_approval["state"] == "VIOLATED"
    assert before_approval["segments"][0]["start_time"] == (
        "2026-09-04T09:00:00Z"
    )
    assert before_approval["segments"][1]["start_time"] == (
        "2026-09-04T12:00:00Z"
    )

    approved = client.post(
        f"/repairs/{proposal['repair_id']}/approve",
        json={
            "evidence": [
                {
                    "evidence_id": f"EVD-FRESH-{uuid4().hex[:8]}",
                    "parameter": "wave_height",
                    "source": "ORCA-LIFE",
                    "value": 1.4,
                    "unit": "m",
                    "timestamp": _now_iso(),
                    "temporal_resolution_h": 1,
                    "data_status": "REAL",
                }
            ]
        },
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"

    final = client.get(f"/commitments/{commitment_id}").json()
    assert final["state"] == "VALID"
    assert final["dependencies"][0]["status"] == "VALID"
    assert final["dependencies"][0]["current_value"] == 1.4
    assert final["segments"][0]["start_time"] == "2026-09-04T09:00:00Z"
    assert final["segments"][1]["start_time"] == "2026-09-04T14:00:00Z"
    assert final["segments"][0]["end_time"] == "2026-09-04T10:00:00Z"
