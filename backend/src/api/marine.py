from fastapi import APIRouter, Query

from src.models.marine import MarineState
from src.services.marine_service import (
    create_state,
    get_state,
    ingest_incois_osf,
    latest_state,
)

router = APIRouter(prefix="/marine", tags=["marine"])
router.post("/state", response_model=MarineState)(create_state)
router.get("/state/latest", response_model=MarineState)(latest_state)
router.get("/state/{state_id}", response_model=MarineState)(get_state)


@router.post("/state/osf", response_model=MarineState)
def ingest_osf_state(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=360),
) -> MarineState:
    """Fetch INCOIS OSF for a point and store it for GET /marine/state/latest."""
    return ingest_incois_osf({"lat": lat, "lon": lon}, persist=True)
