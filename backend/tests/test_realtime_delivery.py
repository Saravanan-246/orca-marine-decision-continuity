import asyncio

from src.models.event import InternalEvent
from src.realtime.channels import channel_router
from src.realtime.clients import ConnectedClient, ClientRegistry
from src.realtime.delivery import EventDelivery


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.messages.append(payload)


def test_internal_event_delivery() -> None:
    async def run() -> None:
        registry = ClientRegistry()
        websocket = FakeWebSocket()

        channel_router.register(
            "global",
        )

        client = ConnectedClient(
            client_id="TEST-CLIENT-1",
            channel="global",
            websocket=websocket,
        )

        registry.register(client)

        delivery = EventDelivery(registry)

        event = InternalEvent(
            event_id="EVENT-001",
            event_type="DEPENDENCY_CHANGED",
            entity_id="C-1042",
            version=1,
            payload={
                "dependency_id": "DEP-WAVE-001",
                "stakeholder_type": "FISHERMAN",
                "status": "VIOLATED",
                "affected_segments": ["SEG-3"],
            },
        )

        delivered = await delivery.deliver(event)

        assert delivered == 1
        assert len(websocket.messages) == 1

        received = websocket.messages[0]

        assert received["event_id"] == "EVENT-001"
        assert received["event_type"] == "DEPENDENCY_CHANGED"
        assert received["entity_id"] == "C-1042"
        assert received["payload"]["status"] == "VIOLATED"

    asyncio.run(run())