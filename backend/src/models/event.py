from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, Field


class InternalEvent(BaseModel):
    event_id: str
    event_type: str
    entity_id: str
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    version: int = 1
    payload: dict[str, Any] = Field(default_factory=dict)