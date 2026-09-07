from datetime import datetime
from typing import Any

from src.models.event import InternalEvent
from src.offline.cache import CacheRecord, OfflineCache, cache
from src.offline.queue import OfflineQueue, QueuedAction, offline_queue
from src.offline.sync import OfflineSync, SyncResult, offline_sync


class OfflineStore:
    """
    Compatibility facade for the offline subsystem.

    Keeps the existing synchronous OfflineStore API while
    delegating storage and queue management to the dedicated modules.
    """

    def __init__(
        self,
        cache_store: OfflineCache | None = None,
        action_queue: OfflineQueue | None = None,
        synchronizer: OfflineSync | None = None,
    ) -> None:
        self.cache = cache_store or cache
        self.queue = action_queue or offline_queue
        self.sync = synchronizer or offline_sync

    def put(
        self,
        record_id: str,
        value: dict[str, Any],
        version: int,
        updated_at: datetime | None = None,
    ) -> CacheRecord:
        return self.cache.put(
            key=record_id,
            value=value,
            version=version,
            updated_at=updated_at,
        )

    def get(
        self,
        record_id: str,
    ) -> CacheRecord | None:
        return self.cache.get(record_id)

    def mark_stale(
        self,
        record_id: str,
    ) -> None:
        self.cache.mark_stale(record_id)

    def enqueue(
        self,
        event: InternalEvent,
    ) -> bool:
        action = QueuedAction(
            action_id=event.event_id,
            action_type=event.event_type,
            entity_id=event.entity_id,
            payload=event.payload,
            version=event.version,
            created_at=event.timestamp,
        )

        return self.queue.enqueue(action)

    def synchronize(
        self,
        handler,
    ) -> list[str]:
        completed: list[str] = []

        while True:
            action = self.queue.peek()

            if action is None:
                break

            try:
                success = handler(
                    InternalEvent(
                        event_id=action.action_id,
                        event_type=action.action_type,
                        entity_id=action.entity_id,
                        version=action.version,
                        timestamp=action.created_at,
                        payload=action.payload,
                    )
                )
            except Exception as exc:
                self.queue.mark_retry(
                    action.action_id,
                    str(exc) or "sync handler failed",
                )
                break

            if not success:
                self.queue.mark_retry(
                    action.action_id,
                    "sync handler returned false",
                )
                break

            completed_action = self.queue.pop()

            if completed_action is None:
                break

            completed.append(completed_action.action_id)

        return completed

    def pending(self) -> list[QueuedAction]:
        return self.queue.pending()

    def pending_count(self) -> int:
        return self.queue.size()


offline_store = OfflineStore()