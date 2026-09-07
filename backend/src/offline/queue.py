from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import RLock
from typing import Any


@dataclass
class QueuedAction:
    action_id: str
    action_type: str
    entity_id: str
    payload: dict[str, Any] = field(default_factory=dict)
    version: int = 1
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    attempts: int = 0
    last_error: str | None = None


class OfflineQueue:
    def __init__(self) -> None:
        self._items: list[QueuedAction] = []
        self._ids: set[str] = set()
        self._lock = RLock()

    def enqueue(self, action: QueuedAction) -> bool:
        self._validate(action)

        with self._lock:
            if action.action_id in self._ids:
                return False

            self._items.append(action)
            self._ids.add(action.action_id)
            return True

    def peek(self) -> QueuedAction | None:
        with self._lock:
            if not self._items:
                return None

            return self._items[0]

    def pop(self) -> QueuedAction | None:
        with self._lock:
            if not self._items:
                return None

            action = self._items.pop(0)
            self._ids.discard(action.action_id)
            return action

    def mark_retry(
        self,
        action_id: str,
        error: str,
    ) -> QueuedAction | None:
        with self._lock:
            for action in self._items:
                if action.action_id == action_id:
                    action.attempts += 1
                    action.last_error = error
                    return action

        return None

    def get(self, action_id: str) -> QueuedAction | None:
        with self._lock:
            for action in self._items:
                if action.action_id == action_id:
                    return action

        return None

    def pending(self) -> list[QueuedAction]:
        with self._lock:
            return list(self._items)

    def remove(self, action_id: str) -> bool:
        with self._lock:
            for index, action in enumerate(self._items):
                if action.action_id == action_id:
                    self._items.pop(index)
                    self._ids.discard(action_id)
                    return True

        return False

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self._ids.clear()

    def contains(self, action_id: str) -> bool:
        with self._lock:
            return action_id in self._ids

    def size(self) -> int:
        with self._lock:
            return len(self._items)

    @staticmethod
    def _validate(action: QueuedAction) -> None:
        if not action.action_id.strip():
            raise ValueError("action_id must not be empty")

        if not action.action_type.strip():
            raise ValueError("action_type must not be empty")

        if not action.entity_id.strip():
            raise ValueError("entity_id must not be empty")

        if action.version < 1:
            raise ValueError("version must be >= 1")

        if (
            action.created_at.tzinfo is None
            or action.created_at.utcoffset() is None
        ):
            raise ValueError(
                "created_at must be timezone-aware"
            )


offline_queue = OfflineQueue()