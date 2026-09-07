from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, ConfigDict


class DataStatus(str, Enum):
    REAL = "REAL"
    SIMULATED = "SIMULATED"
    ASSUMED = "ASSUMED"
    UNKNOWN = "UNKNOWN"


class MarineValue(BaseModel):
    value: Any = None
    unit: str | None = None
    data_status: DataStatus = DataStatus.UNKNOWN
    source: str | None = None


class MarineState(BaseModel):
    model_config = ConfigDict(extra="allow")
    state_id: str
    location: dict[str, Any]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    wind: MarineValue = Field(default_factory=MarineValue)
    wave: MarineValue = Field(default_factory=MarineValue)
    current: MarineValue = Field(default_factory=MarineValue)
    pfz: MarineValue = Field(default_factory=MarineValue)
    hazards: list[dict[str, Any]] = Field(default_factory=list)
    boundary: dict[str, Any] | None = None
    sources: list[str] = Field(default_factory=list)
    freshness: str | None = None
    data_status: DataStatus = DataStatus.UNKNOWN
    version: int = 1
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
