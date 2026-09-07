"""Convert stored MarineState into existing Evidence objects."""

from __future__ import annotations

from typing import Any

from src.integrations.incois_osf import SPATIAL_RESOLUTION_KM, TEMPORAL_RESOLUTION_H
from src.models.evidence import Evidence
from src.models.marine import DataStatus, MarineState, MarineValue
from src.services.marine_service import latest_state_or_none

PARAMETER_FIELDS: tuple[tuple[str, str], ...] = (
    ("wave", "wave_height"),
    ("wind", "wind_speed"),
)


def _is_numeric(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _real_marine_value(item: MarineValue | None) -> MarineValue | None:
    if item is None:
        return None
    if item.data_status is not DataStatus.REAL:
        return None
    if not _is_numeric(item.value):
        return None
    return item


def evidence_from_marine_state(state: MarineState) -> list[Evidence]:
    """
    Map REAL wave/wind fields onto Evidence.

    UNKNOWN, SIMULATED, ASSUMED, and missing values are omitted rather than
    fabricated. Callers pass an empty list through the existing evaluator,
    which yields UNVERIFIABLE.
    """
    items: list[Evidence] = []
    last_updated = state.last_updated_at.isoformat()
    location: dict[str, Any] = {
        **dict(state.location or {}),
        "state_id": state.state_id,
        "freshness": state.freshness,
        "last_updated_at": last_updated,
        "marine_data_status": state.data_status.value,
    }

    for field_name, parameter in PARAMETER_FIELDS:
        marine = _real_marine_value(getattr(state, field_name, None))
        if marine is None:
            continue

        source = marine.source or (state.sources[0] if state.sources else None)
        if not source:
            continue

        items.append(
            Evidence(
                evidence_id=f"E-{state.state_id}-{parameter}",
                parameter=parameter,
                source=source,
                value=marine.value,
                unit=marine.unit,
                timestamp=state.timestamp,
                location=location,
                spatial_resolution_km=SPATIAL_RESOLUTION_KM,
                temporal_resolution_h=TEMPORAL_RESOLUTION_H,
                data_status=DataStatus.REAL,
            )
        )

    return items


def evidence_from_latest_marine_state() -> list[Evidence]:
    state = latest_state_or_none()
    if state is None:
        return []
    return evidence_from_marine_state(state)
