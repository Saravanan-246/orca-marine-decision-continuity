import asyncio

from fastapi.testclient import TestClient

from src.main import app
from src.models.event import InternalEvent
from src.realtime.manager import event_manager


client = TestClient(app)


def test_websocket_receives_published_event() -> None:
    with client.websocket_connect("/ws/global") as websocket:
        connected = websocket.receive_json()

        assert connected["type"] == "CONNECTED"
        assert connected["channel"] == "global"

        event = InternalEvent(
            event_id="EV-WS-E2E-001",
            event_type="DEPENDENCY_CHANGED",
            entity_id="C-WS-E2E-001",
            version=2,
            payload={
                "dependency_id": "DEP-WAVE-001",
                "current_value": 2.3,
                "status": "VIOLATED",
                "affected_segments": ["SEG-3"],
            },
        )

        event_manager.publish(event)

        received = websocket.receive_json()

        assert received["event_id"] == "EV-WS-E2E-001"
        assert received["event_type"] == "DEPENDENCY_CHANGED"
        assert received["entity_id"] == "C-WS-E2E-001"
        assert received["version"] == 2

        assert received["payload"]["status"] == "VIOLATED"
        assert received["payload"]["affected_segments"] == [
            "SEG-3"
        ]