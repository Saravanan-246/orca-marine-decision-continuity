from __future__ import annotations

import asyncio
from uuid import uuid4

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
)

from src.realtime.channels import channel_router
from src.realtime.clients import (
    ConnectedClient,
    client_registry,
)


router = APIRouter(tags=["realtime"])


@router.websocket("/ws/{channel}")
async def websocket_endpoint(
    websocket: WebSocket,
    channel: str,
) -> None:
    await websocket.accept()

    normalized_channel = channel.strip()

    if not normalized_channel:
        await websocket.close(code=1008)
        return

    if (
        channel_router.get(
            normalized_channel
        )
        is None
    ):
        channel_router.register(
            normalized_channel
        )

    client_id = f"WS-{uuid4().hex}"

    stakeholder_type = (
        websocket.query_params.get(
            "stakeholder_type"
        )
    )

    if stakeholder_type is not None:
        stakeholder_type = (
            stakeholder_type.strip() or None
        )

    client_loop = asyncio.get_running_loop()

    client = ConnectedClient(
        client_id=client_id,
        channel=normalized_channel,
        websocket=websocket,
        stakeholder_type=stakeholder_type,
        loop=client_loop,
    )

    client_registry.register(client)

    try:
        await websocket.send_json(
            {
                "type": "CONNECTED",
                "channel": normalized_channel,
                "client_id": client_id,
            }
        )

        while True:
            try:
                message = (
                    await websocket.receive_json()
                )

            except WebSocketDisconnect:
                raise

            except Exception:
                # Ignore malformed client messages without
                # terminating the realtime connection.
                continue

            if not isinstance(message, dict):
                continue

            message_type = message.get("type")

            if message_type == "PING":
                await websocket.send_json(
                    {
                        "type": "PONG",
                        "client_id": client_id,
                    }
                )

    except WebSocketDisconnect:
        pass

    finally:
        client_registry.unregister(
            client_id
        )