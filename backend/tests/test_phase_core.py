from uuid import uuid4

from fastapi.testclient import TestClient

from src.engines.dependency_engine import (
    evaluate_dependency,
    transition_allowed,
)
from src.main import app
from src.models.dependency import (
    DecisionDependency,
    DependencyStatus,
    ValueRange,
)


client = TestClient(app)


def make_dependency() -> DecisionDependency:
    return DecisionDependency(
        dependency_id="D1",
        parameter="wave_height",
        source="test",
        value_at_commit=1.4,
        valid_range=ValueRange(
            min=0,
            max=2,
        ),
        segment_ids=["SEG-3"],
    )


def test_health_endpoint() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "orca-intelligence",
    }


def test_dependency_states_and_affected_segments() -> None:
    dependency = make_dependency()

    valid = evaluate_dependency(
        dependency,
        1.4,
    )
    assert valid.status == DependencyStatus.VALID

    at_risk = evaluate_dependency(
        dependency,
        1.95,
    )
    assert at_risk.status == DependencyStatus.AT_RISK

    violated = evaluate_dependency(
        dependency,
        2.3,
    )
    assert violated.status == DependencyStatus.VIOLATED
    assert violated.affected_segments == ["SEG-3"]


def test_invalid_state_transition() -> None:
    assert not transition_allowed(
        "VALID",
        "REPAIRED",
    )

    assert transition_allowed(
        "VIOLATED",
        "REPAIRED",
    )


def test_marine_create_and_read() -> None:
    state_id = f"S-TEST-{uuid4().hex}"

    payload = {
        "state_id": state_id,
        "location": {
            "lat": 10,
            "lon": 72,
        },
        "data_status": "SIMULATED",
        "wave": {
            "value": 1.2,
            "unit": "m",
            "data_status": "SIMULATED",
        },
    }

    create_response = client.post(
        "/marine/state",
        json=payload,
    )

    assert create_response.status_code == 200

    get_response = client.get(
        f"/marine/state/{state_id}",
    )

    assert get_response.status_code == 200
    assert get_response.json()["state_id"] == state_id