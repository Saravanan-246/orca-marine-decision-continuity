import asyncio
from datetime import datetime, timezone
from src.models.event import InternalEvent
from src.realtime.clients import ClientRegistry, ConnectedClient
from src.realtime.delivery import EventDelivery
from src.realtime.channels import channel_router
from src.offline.core import OfflineStore
from src.integrations.base import SimulatedProvider, UnavailableProvider

class Socket:
    def __init__(self, fail=False): self.messages, self.fail = [], fail
    async def send_json(self, value):
        if self.fail: raise RuntimeError("closed")
        self.messages.append(value)

def test_realtime_routing_and_failed_client_isolation():
    channel_router.register("global")
    registry = ClientRegistry(); good, bad = Socket(), Socket(True)
    registry.register(ConnectedClient("good", "global", good)); registry.register(ConnectedClient("bad", "global", bad))
    event = InternalEvent(event_id="E1", event_type="COMMITMENT_UPDATED", entity_id="C1")
    delivered = asyncio.run(EventDelivery(registry).deliver(event))
    assert delivered == 1 and len(good.messages) == 1 and "bad" not in registry.clients

def test_offline_cache_order_duplicate_and_retry():
    store = OfflineStore(); now = datetime.now(timezone.utc)
    store.put("C1", {"state":"VALID"}, 2, now); store.put("C1", {"state":"OLD"}, 1, now)
    assert store.get("C1").value["state"] == "VALID"
    event = InternalEvent(event_id="E1", event_type="SYNC_REQUIRED", entity_id="C1")
    assert store.enqueue(event) and not store.enqueue(event)
    assert store.synchronize(lambda _: False) == [] and store.synchronize(lambda _: True) == ["E1"]

def test_normalized_provider_statuses():
    simulated = SimulatedProvider("demo", {"wave_height": 1.4}).fetch("wave_height")
    unavailable = UnavailableProvider("weather").fetch("wind_speed")
    assert simulated.data_status.value == "SIMULATED" and simulated.value == 1.4
    assert unavailable.data_status.value == "UNKNOWN" and unavailable.value is None
