from datetime import datetime
from pydantic import BaseModel

class ConflictCheckRequest(BaseModel):
    commitment: dict
    override_coordination: bool = False

class ConflictResult(BaseModel):
    conflict: bool
    conflict_id: str | None = None
    existing_commitment_id: str | None = None
    new_stakeholder: str | None = None
    existing_stakeholder: str | None = None
    overlap: dict | None = None
    reason: str | None = None
    resolution: str | None = None

