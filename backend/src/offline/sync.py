from collections.abc import Awaitable, Callable
from typing import Any

from src.offline.queue import OfflineQueue, QueuedAction


SyncHandler = Callable[
    [QueuedAction],
    Awaitable[bool],
]


class SyncResult:
    def __init__(
        self,
        action_id: str,
        success: bool,
        attempts: int,
        error: str | None = None,
    ) -> None:
        self.action_id = action_id
        self.success = success
        self.attempts = attempts
        self.error = error

    def to_dict(self) -> dict[str, Any]:
        return {
            "action_id": self.action_id,
            "success": self.success,
            "attempts": self.attempts,
            "error": self.error,
        }


class OfflineSync:
    def __init__(
        self,
        queue: OfflineQueue,
    ) -> None:
        self.queue = queue

    async def sync(
        self,
        handler: SyncHandler,
    ) -> list[SyncResult]:
        results: list[SyncResult] = []

        while True:
            action = self.queue.peek()

            if action is None:
                break

            try:
                success = await handler(action)

            except Exception as exc:
                error = str(exc) or "sync handler failed"

                updated = self.queue.mark_retry(
                    action.action_id,
                    error,
                )

                results.append(
                    SyncResult(
                        action_id=action.action_id,
                        success=False,
                        attempts=(
                            updated.attempts
                            if updated is not None
                            else action.attempts + 1
                        ),
                        error=error,
                    )
                )

                # Stop here to preserve FIFO ordering.
                break

            if success:
                completed = self.queue.pop()

                results.append(
                    SyncResult(
                        action_id=action.action_id,
                        success=completed is not None,
                        attempts=(
                            action.attempts + 1
                        ),
                    )
                )

                continue

            updated = self.queue.mark_retry(
                action.action_id,
                "sync handler returned false",
            )

            results.append(
                SyncResult(
                    action_id=action.action_id,
                    success=False,
                    attempts=(
                        updated.attempts
                        if updated is not None
                        else action.attempts + 1
                    ),
                    error="sync handler returned false",
                )
            )

            # Preserve order; don't skip a failed action.
            break

        return results

    def pending_count(self) -> int:
        return self.queue.size()

    def pending_actions(self) -> list[QueuedAction]:
        return self.queue.pending()


offline_sync = OfflineSync(
    queue=OfflineQueue(),
)