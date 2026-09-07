from dataclasses import dataclass
from typing import Any

from src.models.event import InternalEvent


@dataclass(frozen=True)
class EventChannel:
    name: str
    stakeholder_types: frozenset[str] = frozenset()


class ChannelRouter:
    def __init__(self) -> None:
        self._channels: dict[str, EventChannel] = {}

    def register(
        self,
        name: str,
        stakeholder_types: set[str] | None = None,
    ) -> EventChannel:
        name = name.strip()

        if not name:
            raise ValueError("channel name must not be empty")

        channel = EventChannel(
            name=name,
            stakeholder_types=frozenset(
                stakeholder_types or set()
            ),
        )

        self._channels[name] = channel
        return channel

    def get(
        self,
        name: str,
    ) -> EventChannel | None:
        return self._channels.get(name)

    def channels_for_event(
        self,
        event: InternalEvent,
    ) -> list[EventChannel]:
        stakeholder_type = _extract_stakeholder_type(event)

        if not stakeholder_type:
            return list(self._channels.values())

        matched: list[EventChannel] = []

        for channel in self._channels.values():
            if not channel.stakeholder_types:
                matched.append(channel)
            elif stakeholder_type in channel.stakeholder_types:
                matched.append(channel)

        return matched


def _extract_stakeholder_type(
    event: InternalEvent,
) -> str | None:
    payload: Any = event.payload

    if not isinstance(payload, dict):
        return None

    value = payload.get("stakeholder_type")

    if not isinstance(value, str):
        return None

    value = value.strip()

    return value or None


channel_router = ChannelRouter()