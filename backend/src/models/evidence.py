from datetime import datetime
from pydantic import BaseModel
from src.models.marine import DataStatus


class Evidence(BaseModel):
    evidence_id: str
    parameter: str
    source: str
    value: object
    unit: str | None = None
    timestamp: datetime
    location: dict[str, object] | None = None
    spatial_resolution_km: float | None = None
    temporal_resolution_h: float | None = None
    data_status: DataStatus
