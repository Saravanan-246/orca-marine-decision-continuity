from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field

class RepairStatus(str, Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class RepairOption(BaseModel):
    option_id: str
    repair_type: str
    affected_segments: list[str]
    changes: dict
    disruption_score: float
    reason: str

class RepairProposal(BaseModel):
    repair_id: str
    commitment_id: str
    violated_dependency_id: str
    affected_segments: list[str]
    preserved_segments: list[str]
    options: list[RepairOption]
    selected_option: str | None = None
    disruption_score: float | None = None
    reason: str
    requires_human_approval: bool = True
    status: RepairStatus = RepairStatus.PROPOSED
    previous_value: object = None
    current_value: object = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1

