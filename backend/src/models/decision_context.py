from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, ConfigDict

class ContextDataStatus(str, Enum):
    REAL = "REAL"
    SIMULATED = "SIMULATED"
    ASSUMED = "ASSUMED"
    UNKNOWN = "UNKNOWN"

class ContextState(str, Enum):
    VALID = "VALID"
    UNVERIFIABLE = "UNVERIFIABLE"

class ContextEvidence(BaseModel):
    evidence_id: str
    parameter: str
    source: str
    value: Any = None
    unit: str | None = None
    observed_at: datetime
    spatial_resolution_km: float | None = None
    temporal_resolution_h: float | None = None
    data_status: ContextDataStatus = ContextDataStatus.UNKNOWN

class ContextSegment(BaseModel):
    segment_id: str
    label: str = ""
    start_time: datetime
    end_time: datetime
    spatial_scope: dict[str, Any] | None = None
    required_conditions: dict[str, dict[str, float]] = Field(default_factory=dict)

class ContextDependency(BaseModel):
    dependency_id: str
    parameter: str
    source: str = ""
    value_at_commit: Any = None
    valid_range: dict[str, Any] = Field(default_factory=dict)
    segment_ids: list[str] = Field(default_factory=list)

class EvaluationTrace(BaseModel):
    input_used: str
    dependency_id: str
    previous_value: Any = None
    current_value: Any = None
    threshold_range: dict[str, Any] = Field(default_factory=dict)
    result: str
    reason: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DecisionContext(BaseModel):
    model_config = ConfigDict(extra="allow")
    context_id: str
    decision_type: str
    stakeholder: str
    spatial_scope: dict[str, Any] | None = None
    temporal_scope: dict[str, Any] | None = None
    segments: list[ContextSegment] = Field(default_factory=list)
    evidence_summary: list[ContextEvidence] = Field(default_factory=list)
    dependency_index: dict[str, ContextDependency] = Field(default_factory=dict)
    constraint_summary: dict[str, Any] = Field(default_factory=dict)
    data_status: ContextDataStatus = ContextDataStatus.UNKNOWN
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1
    state: ContextState = ContextState.UNVERIFIABLE
    evaluation_trace: list[EvaluationTrace] = Field(default_factory=list)
