from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class EventType(str, Enum):
    MARINE_STATE_UPDATED = "MARINE_STATE_UPDATED"
    DEPENDENCY_CHANGED = "DEPENDENCY_CHANGED"
    COMMITMENT_UPDATED = "COMMITMENT_UPDATED"
    CONFLICT_DETECTED = "CONFLICT_DETECTED"
    REPAIR_PROPOSED = "REPAIR_PROPOSED"
    REPAIR_APPROVED = "REPAIR_APPROVED"
    REPAIR_REJECTED = "REPAIR_REJECTED"
    SYNC_REQUIRED = "SYNC_REQUIRED"


class InternalEvent(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
    )

    event_id: str = Field(min_length=1)
    event_type: EventType
    entity_id: str = Field(min_length=1)
    version: int = Field(default=1, ge=1)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("event_id", "entity_id")
    @classmethod
    def validate_identifier(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("identifier must not be empty")

        return value

    @field_validator("timestamp")
    @classmethod
    def validate_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must be timezone-aware")

        return value.astimezone(timezone.utc)