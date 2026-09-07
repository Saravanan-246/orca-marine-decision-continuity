import asyncio

from src.models.event import InternalEvent
from src.realtime.channels import channel_router
from src.realtime.clients import ClientRegistry, ConnectedClient
from src.realtime.delivery import EventDelivery
from src.realtime.manager import EventManager


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.messages.append(payload)


def test_event_manager_to_realtime_delivery() -> None:
    channel_router.register("global")

    registry = ClientRegistry()
    websocket = FakeWebSocket()

    registry.register(
        ConnectedClient(
            client_id="E2E-WS-1",
            channel="global",
            websocket=websocket,
        )
    )

    delivery = EventDelivery(registry)
    manager = EventManager()
    delivered_events: list[InternalEvent] = []

    event = InternalEvent(
        event_id="EV-E2E-001",
        event_type="DEPENDENCY_CHANGED",
        entity_id="C-E2E-001",
        version=2,
        payload={
            "commitment_id": "C-E2E-001",
            "dependency_id": "DEP-WAVE-001",
            "previous_value": 1.4,
            "current_value": 2.3,
            "status": "VIOLATED",
            "affected_segments": ["SEG-3"],
        },
    )

    def listener(received_event: InternalEvent) -> None:
        delivered_events.append(received_event)

    manager.subscribe(listener)

    published = manager.publish(event)

    assert published.event_id == "EV-E2E-001"
    assert delivered_events == [event]
    assert manager.listener_count() == 1

    asyncio.run(
        delivery.deliver(event)
    )

    assert len(websocket.messages) == 1

    message = websocket.messages[0]

    assert message["event_id"] == "EV-E2E-001"
    assert message["event_type"] == "DEPENDENCY_CHANGED"
    assert message["entity_id"] == "C-E2E-001"
    assert message["version"] == 2

    assert message["payload"]["dependency_id"] == (
        "DEP-WAVE-001"
    )

    assert message["payload"]["previous_value"] == 1.4
    assert message["payload"]["current_value"] == 2.3
    assert message["payload"]["status"] == "VIOLATED"

    assert message["payload"]["affected_segments"] == [
        "SEG-3"
    ]

    assert "E2E-WS-1" in registry.clients

    manager.unsubscribe(listener)

    assert manager.listener_count() == 0
