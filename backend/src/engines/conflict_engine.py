from datetime import datetime
from typing import Any

from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry
from shapely.validation import explain_validity

from src.models.commitment import MarineCommitment
from src.models.conflict import ConflictResult


def _times(
    commitment: MarineCommitment,
) -> tuple[datetime, datetime]:
    starts = [segment.start_time for segment in commitment.segments]
    ends = [segment.end_time for segment in commitment.segments]

    return min(starts), max(ends)


def _geometry(
    scope: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not scope:
        return None

    return scope.get("geometry", scope)


def _parse_geometry(
    scope: dict[str, Any] | None,
) -> BaseGeometry | None:
    geometry_data = _geometry(scope)

    if not geometry_data:
        return None

    geometry = shape(geometry_data)

    if geometry.is_empty:
        raise ValueError("Geometry is empty")

    if not geometry.is_valid:
        reason = explain_validity(geometry)
        raise ValueError(f"Invalid geometry: {reason}")

    return geometry


def spatial_overlap(
    left: dict[str, Any] | None,
    right: dict[str, Any] | None,
) -> bool:
    left_geometry = _parse_geometry(left)
    right_geometry = _parse_geometry(right)

    if left_geometry is None or right_geometry is None:
        return False

    return bool(left_geometry.intersects(right_geometry))


def operational_conflict(
    new: MarineCommitment,
    existing: MarineCommitment,
) -> bool:
    if (
        new.stakeholder_type == existing.stakeholder_type
        and new.decision_type == existing.decision_type
    ):
        return False

    return (
        new.decision_type != existing.decision_type
        or new.stakeholder_type != existing.stakeholder_type
    )


def check_pair(
    new: MarineCommitment,
    existing: MarineCommitment,
) -> ConflictResult:
    new_start, new_end = _times(new)
    old_start, old_end = _times(existing)

    start = max(new_start, old_start)
    end = min(new_end, old_end)

    if start >= end:
        return ConflictResult(conflict=False)

    if not operational_conflict(new, existing):
        return ConflictResult(conflict=False)

    if not spatial_overlap(
        new.spatial_scope,
        existing.spatial_scope,
    ):
        return ConflictResult(conflict=False)

    minutes = int(
        (end - start).total_seconds() / 60
    )

    return ConflictResult(
        conflict=True,
        existing_commitment_id=existing.commitment_id,
        new_stakeholder=new.stakeholder_type,
        existing_stakeholder=existing.stakeholder_type,
        overlap={
            "start": start,
            "end": end,
            "duration_minutes": minutes,
        },
        reason=(
            "Overlapping operational commitments "
            "share time and spatial scope"
        ),
        resolution="COORDINATION_REQUIRED",
    )