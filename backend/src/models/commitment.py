from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator

from src.models.dependency import DecisionDependency
from src.models.evidence import Evidence


class CommitmentState(str, Enum):
    DRAFT = "DRAFT"
    VALID = "VALID"
    AT_RISK = "AT_RISK"
    VIOLATED = "VIOLATED"
    REPAIRED = "REPAIRED"
    EXPIRED = "EXPIRED"
    UNVERIFIABLE = "UNVERIFIABLE"


class CommitmentSegment(BaseModel):
    segment_id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    start_time: datetime
    end_time: datetime
    required_conditions: dict[str, dict[str, float]] = Field(
        default_factory=dict
    )

    @model_validator(mode="after")
    def validate_time_window(self) -> "CommitmentSegment":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class MarineDecision(BaseModel):
    stakeholder_type: str = Field(min_length=1)
    decision_type: str = Field(min_length=1)
    decision_summary: str = Field(min_length=1)
    spatial_scope: dict[str, object] | None = None
    temporal_scope: dict[str, object] | None = None


class MarineCommitment(MarineDecision):
    commitment_id: str = Field(min_length=1)

    segments: list[CommitmentSegment] = Field(min_length=1)
    dependencies: list[DecisionDependency] = Field(default_factory=list)
    evidence: list[Evidence] = Field(default_factory=list)

    state: CommitmentState = CommitmentState.DRAFT

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    version: int = Field(default=1, ge=1)

    last_updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    @field_validator(
        "commitment_id",
        "stakeholder_type",
        "decision_type",
        "decision_summary",
        mode="before",
    )
    @classmethod
    def reject_blank_strings(cls, value: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("value must be a non-empty string")
        return value.strip()

    @model_validator(mode="after")
    def validate_timestamps(self) -> "MarineCommitment":
        if self.updated_at < self.created_at:
            raise ValueError(
                "updated_at cannot be earlier than created_at"
            )

        if self.last_updated_at < self.created_at:
            raise ValueError(
                "last_updated_at cannot be earlier than created_at"
            )

        return self