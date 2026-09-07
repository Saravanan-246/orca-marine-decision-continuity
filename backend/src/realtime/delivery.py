from __future__ import annotations

import inspect
from typing import Any

from src.models.event import InternalEvent
from src.realtime.channels import channel_router
from src.realtime.clients import (
    ClientRegistry,
    ConnectedClient,
)


class EventDelivery:
    def __init__(
        self,
        registry: ClientRegistry,
    ) -> None:
        self.registry = registry

    async def deliver(
        self,
        event: InternalEvent,
    ) -> int:
        payload: dict[str, Any] = (
            event.model_dump(mode="json")
        )

        delivered = 0
        delivered_clients: set[str] = set()

        channels = (
            channel_router.channels_for_event(event)
        )

        for channel in channels:
            clients = tuple(
                self.registry.matching(
                    channel.name
                )
            )

            for client in clients:
                if client.client_id in delivered_clients:
                    continue

                delivered_clients.add(
                    client.client_id
                )

                if await self._send(
                    client,
                    payload,
                ):
                    delivered += 1

        return delivered

    async def deliver_to_client(
        self,
        event: InternalEvent,
        client: ConnectedClient,
    ) -> bool:
        """
        Deliver an event to exactly one client.

        This is used by EventManager when the caller thread and
        the WebSocket client's asyncio loop are different.
        """
        channels = (
            channel_router.channels_for_event(event)
        )

        allowed_channels = {
            channel.name
            for channel in channels
        }

        if client.channel not in allowed_channels:
            return False

        payload: dict[str, Any] = (
            event.model_dump(mode="json")
        )

        return await self._send(
            client,
            payload,
        )

    async def _send(
        self,
        client: ConnectedClient,
        payload: dict[str, Any],
    ) -> bool:
        try:
            result = client.websocket.send_json(
                payload
            )

            if inspect.isawaitable(result):
                await result

            return True

        except Exception:
            self.registry.unregister(
                client.client_id
            )
            return False