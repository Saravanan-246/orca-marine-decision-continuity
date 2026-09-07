from datetime import datetime, timezone
from fastapi import HTTPException
from src.core.database import db
from src.models.marine import MarineState

def create_state(state: MarineState) -> MarineState:
    document = state.model_dump(mode="json")
    document["_id"] = state.state_id
    db.collection("marine_states").insert_one(document)
    return state

def get_state(state_id: str) -> MarineState:
    item = db.collection("marine_states").find_one({"state_id": state_id})
    if not item:
        raise HTTPException(404, detail={"code": "MARINE_STATE_NOT_FOUND", "message": f"Marine state {state_id} was not found"})
    item.pop("_id", None)
    return MarineState.model_validate(item)

def _as_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.min.replace(tzinfo=timezone.utc)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    return datetime.min.replace(tzinfo=timezone.utc)


def latest_state_or_none() -> MarineState | None:
    items = db.collection("marine_states").find({})
    if not items:
        return None
    item = max(
        items,
        key=lambda x: (
            _as_datetime(x.get("timestamp")),
            _as_datetime(x.get("last_updated_at")),
        ),
    )
    item.pop("_id", None)
    return MarineState.model_validate(item)


def latest_state() -> MarineState:
    item = latest_state_or_none()
    if item is None:
        raise HTTPException(404, detail={"code": "MARINE_STATE_NOT_FOUND", "message": "No marine state was found"})
    return item


def upsert_state(state: MarineState) -> MarineState:
    document = state.model_dump(mode="json")
    document["_id"] = state.state_id
    collection = db.collection("marine_states")
    if db.memory:
        collection.items[str(document["_id"])] = document.copy()
        return state
    collection.replace_one({"_id": state.state_id}, document, upsert=True)
    return state


def ingest_incois_osf(
    location: dict,
    *,
    persist: bool = False,
) -> MarineState:
    """
    Fetch INCOIS OSF WW3 for a point and optionally persist it.

    Does not fabricate marine values when the source is unavailable.
    """
    from src.integrations.incois_osf import IncoisOsfProvider

    state = IncoisOsfProvider().build_state(location)
    if persist:
        return upsert_state(state)
    return state

