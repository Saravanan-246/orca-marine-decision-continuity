from fastapi import APIRouter, Query
from src.models.commitment import MarineCommitment
from src.services.commitment_service import create_commitment, get_commitment, list_commitments
router = APIRouter(prefix="/commitments", tags=["commitments"])
router.post("", response_model=MarineCommitment)(create_commitment)
router.get("", response_model=list[MarineCommitment])(lambda limit=Query(50, ge=1, le=200), offset=Query(0, ge=0): list_commitments(limit, offset))
router.get("/{commitment_id}", response_model=MarineCommitment)(get_commitment)
