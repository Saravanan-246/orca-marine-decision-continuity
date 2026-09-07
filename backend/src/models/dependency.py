from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, model_validator


class DependencyStatus(str, Enum):
    VALID = "VALID"
    AT_RISK = "AT_RISK"
    VIOLATED = "VIOLATED"
    UNKNOWN = "UNKNOWN"
    UNVERIFIABLE = "UNVERIFIABLE"


class ValueRange(BaseModel):
    min: float | None = None
    max: float | None = None
    risk_margin: float = Field(default=0.1, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_range(self) -> "ValueRange":
        if self.min is None and self.max is None:
            raise ValueError("At least one of min or max must be provided")

        if self.min is not None and self.max is not None and self.min > self.max:
            raise ValueError("min must be less than or equal to max")

        return self


class DecisionDependency(BaseModel):
    dependency_id: str = Field(min_length=1)
    parameter: str = Field(min_length=1)
    source: str = Field(min_length=1)

    value_at_commit: Any = None

    valid_range: ValueRange

    location: dict[str, Any] | None = None

    spatial_resolution_km: float | None = Field(
        default=None,
        ge=0.0,
    )

    temporal_resolution_h: float | None = Field(
        default=None,
        ge=0.0,
    )

    observed_at: datetime | None = None
    current_value: Any = None

    status: DependencyStatus = DependencyStatus.UNKNOWN

    segment_ids: list[str] = Field(default_factory=list)