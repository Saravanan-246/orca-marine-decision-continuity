from datetime import datetime, timezone
from typing import Any, Protocol
from pydantic import BaseModel
from src.models.marine import DataStatus

class NormalizedEvidence(BaseModel):
    parameter: str
    value: Any = None
    unit: str | None = None
    source: str
    timestamp: datetime
    location: dict[str, Any] | None = None
    spatial_resolution_km: float | None = None
    temporal_resolution_h: float | None = None
    data_status: DataStatus

class MarineProvider(Protocol):
    def fetch(self, parameter: str, location: dict[str, Any] | None = None) -> NormalizedEvidence: ...

class UnavailableProvider:
    def __init__(self, source: str) -> None:
        self.source = source

    def fetch(self, parameter: str, location: dict[str, Any] | None = None) -> NormalizedEvidence:
        return NormalizedEvidence(parameter=parameter, source=self.source, timestamp=datetime.now(timezone.utc), location=location, data_status=DataStatus.UNKNOWN)

class SimulatedProvider:
    def __init__(self, source: str, values: dict[str, Any]) -> None:
        self.source, self.values = source, values

    def fetch(self, parameter: str, location: dict[str, Any] | None = None) -> NormalizedEvidence:
        return NormalizedEvidence(parameter=parameter, value=self.values.get(parameter), source=self.source, timestamp=datetime.now(timezone.utc), location=location, data_status=DataStatus.SIMULATED)

