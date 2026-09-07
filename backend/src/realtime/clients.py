from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class ConnectedClient:
    client_id: str
    channel: str
    websocket: Any
    stakeholder_type: str | None = None
    loop: asyncio.AbstractEventLoop | None = None
    connected_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ClientRegistry:
    def __init__(self) -> None:
        self.clients: dict[str, ConnectedClient] = {}
        self.by_channel: dict[str, set[str]] = {}
        self.by_stakeholder: dict[str, set[str]] = {}

    def register(
        self,
        client: ConnectedClient,
    ) -> None:
        self.unregister(client.client_id)

        self.clients[client.client_id] = client

        self.by_channel.setdefault(
            client.channel,
            set(),
        ).add(client.client_id)

        if client.stakeholder_type:
            self.by_stakeholder.setdefault(
                client.stakeholder_type,
                set(),
            ).add(client.client_id)

    def unregister(
        self,
        client_id: str,
    ) -> None:
        client = self.clients.pop(client_id, None)

        if client is None:
            return

        channel_clients = self.by_channel.get(
            client.channel
        )

        if channel_clients is not None:
            channel_clients.discard(client_id)

            if not channel_clients:
                self.by_channel.pop(
                    client.channel,
                    None,
                )

        if client.stakeholder_type:
            stakeholder_clients = (
                self.by_stakeholder.get(
                    client.stakeholder_type
                )
            )

            if stakeholder_clients is not None:
                stakeholder_clients.discard(
                    client_id
                )

                if not stakeholder_clients:
                    self.by_stakeholder.pop(
                        client.stakeholder_type,
                        None,
                    )

    def get(
        self,
        client_id: str,
    ) -> ConnectedClient | None:
        return self.clients.get(client_id)

    def matching(
        self,
        channel: str,
    ) -> list[ConnectedClient]:
        client_ids = self.by_channel.get(
            channel,
            set(),
        )

        return [
            self.clients[client_id]
            for client_id in tuple(client_ids)
            if client_id in self.clients
        ]

    def matching_stakeholder(
        self,
        stakeholder_type: str,
    ) -> list[ConnectedClient]:
        client_ids = self.by_stakeholder.get(
            stakeholder_type,
            set(),
        )

        return [
            self.clients[client_id]
            for client_id in tuple(client_ids)
            if client_id in self.clients
        ]

    def all_clients(self) -> list[ConnectedClient]:
        return list(self.clients.values())

    def count(self) -> int:
        return len(self.clients)


client_registry = ClientRegistry()