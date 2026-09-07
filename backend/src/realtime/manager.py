from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable

from src.models.event import InternalEvent
from src.realtime.clients import (
    ConnectedClient,
    client_registry,
)
from src.realtime.delivery import EventDelivery


logger = logging.getLogger(__name__)

EventListener = Callable[[InternalEvent], None]


class EventManager:
    """
    Central realtime event manager.

    Supports synchronous publishers and asynchronous WebSocket
    clients, including clients running on another thread's
    asyncio event loop.
    """

    def __init__(self) -> None:
        self._listeners: list[EventListener] = []
        self._delivery = EventDelivery(
            client_registry
        )

    def subscribe(
        self,
        listener: EventListener,
    ) -> None:
        if listener not in self._listeners:
            self._listeners.append(listener)

    def unsubscribe(
        self,
        listener: EventListener,
    ) -> None:
        if listener in self._listeners:
            self._listeners.remove(listener)

    def _notify_listeners(
        self,
        event: InternalEvent,
    ) -> None:
        for listener in tuple(self._listeners):
            try:
                listener(event)

            except Exception:
                event_type = getattr(
                    event.event_type,
                    "value",
                    event.event_type,
                )

                logger.exception(
                    "Realtime event listener failed",
                    extra={
                        "event_id": event.event_id,
                        "event_type": str(event_type),
                    },
                )

    def publish(
        self,
        event: InternalEvent,
    ) -> InternalEvent:
        """
        Publish synchronously.

        Listener callbacks execute immediately.

        Realtime delivery is:
        - scheduled directly when an asyncio loop is active
        - handed safely to each connected client's loop when
          called from synchronous code
        """
        self._notify_listeners(event)
        self._schedule_delivery(event)

        return event

    async def publish_async(
        self,
        event: InternalEvent,
    ) -> InternalEvent:
        """
        Publish and await realtime delivery.
        """
        self._notify_listeners(event)

        await self._deliver(event)

        return event

    def _schedule_delivery(
        self,
        event: InternalEvent,
    ) -> None:
        try:
            current_loop = (
                asyncio.get_running_loop()
            )
        except RuntimeError:
            current_loop = None

        if current_loop is not None:
            task = current_loop.create_task(
                self._deliver(event)
            )

            task.add_done_callback(
                self._consume_delivery_result
            )
            return

        # No loop on the publisher thread.
        #
        # This is common when FastAPI runs a synchronous
        # endpoint in a worker thread while WebSocket clients
        # live on another asyncio loop.
        #
        # Hand the delivery coroutine to each client's own loop.
        scheduled_clients: set[str] = set()

        for client in client_registry.all_clients():
            if client.client_id in scheduled_clients:
                continue

            loop = client.loop

            if loop is None or loop.is_closed():
                continue

            scheduled_clients.add(
                client.client_id
            )

            try:
                future = (
                    asyncio.run_coroutine_threadsafe(
                        self._deliver_to_client(
                            event,
                            client,
                        ),
                        loop,
                    )
                )

                future.add_done_callback(
                    self._consume_threadsafe_result
                )

            except RuntimeError:
                logger.debug(
                    "Unable to schedule realtime delivery",
                    extra={
                        "event_id": event.event_id,
                        "client_id": client.client_id,
                    },
                )

    async def _deliver_to_client(
        self,
        event: InternalEvent,
        client: ConnectedClient,
    ) -> None:
        try:
            delivered = (
                await self._delivery.deliver_to_client(
                    event,
                    client,
                )
            )

            logger.debug(
                "Realtime client delivery complete",
                extra={
                    "event_id": event.event_id,
                    "client_id": client.client_id,
                    "delivered": delivered,
                },
            )

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception(
                "Realtime client delivery failed",
                extra={
                    "event_id": event.event_id,
                    "client_id": client.client_id,
                },
            )

    async def _deliver(
        self,
        event: InternalEvent,
    ) -> None:
        try:
            delivered = await self._delivery.deliver(
                event
            )

            logger.debug(
                "Realtime event delivered",
                extra={
                    "event_id": event.event_id,
                    "delivered_clients": delivered,
                },
            )

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception(
                "Realtime event delivery failed",
                extra={
                    "event_id": event.event_id,
                },
            )

    @staticmethod
    def _consume_delivery_result(
        task: asyncio.Task[None],
    ) -> None:
        try:
            task.result()

        except asyncio.CancelledError:
            logger.debug(
                "Realtime delivery task cancelled"
            )

        except Exception:
            logger.exception(
                "Realtime delivery task failed"
            )

    @staticmethod
    def _consume_threadsafe_result(
        future,
    ) -> None:
        try:
            future.result()

        except asyncio.CancelledError:
            logger.debug(
                "Thread-safe realtime delivery cancelled"
            )

        except Exception:
            logger.exception(
                "Thread-safe realtime delivery failed"
            )

    def listener_count(self) -> int:
        return len(self._listeners)


event_manager = EventManager()