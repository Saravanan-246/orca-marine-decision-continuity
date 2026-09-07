from src.agents.orchestrator import create_orchestrator


BASE_INTENT = {
    "stakeholder_type": "FISHERMAN",
    "decision_type": "FISHING_TRIP",
    "decision_summary": "Test fishing decision",
    "location": {
        "lat": 13.05,
        "lon": 80.28,
    },
    "spatial_scope": {
        "geometry": {
            "type": "Point",
            "coordinates": [80.28, 13.05],
        }
    },
    "temporal_scope": {
        "start": "2026-09-04T09:00:00Z",
        "end": "2026-09-04T13:00:00Z",
    },
    "segments": [],
    "dependencies": [],
}


def test_orca_orchestrator_default_agents() -> None:
    orchestrator = create_orchestrator()

    assert set(orchestrator.agent_names) == {
        "weather",
        "ocean",
        "pfz",
        "hazard",
        "route",
    }


def test_orca_orchestrator_builds_context() -> None:
    orchestrator = create_orchestrator()

    context = orchestrator.build_context(
        BASE_INTENT.copy()
    )

    assert context is not None
    assert context.decision_type == "FISHING_TRIP"
    assert context.stakeholder == "FISHERMAN"


def test_orca_orchestrator_selects_specific_agents() -> None:
    orchestrator = create_orchestrator()

    context = orchestrator.build_context(
        BASE_INTENT.copy(),
        agent_names=["ocean", "pfz"],
    )

    assert context is not None
    assert context.decision_type == "FISHING_TRIP"
    assert context.stakeholder == "FISHERMAN"