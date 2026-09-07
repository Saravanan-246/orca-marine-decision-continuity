from typing import Any

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel

from src.models.commitment import MarineCommitment
from src.models.conflict import ConflictCheckRequest
from src.models.evidence import Evidence
from src.models.repair import RepairProposal, RepairStatus
from src.services.commitment_service import get_commitment
from src.services.conflict_service import find_conflicts
from src.services.monitor_service import (
    dependency_list,
    reevaluate_all,
    reevaluate_commitment,
)
from src.services.repair_service import (
    generate_candidates,
    list_repairs,
    propose_ranked,
    rank_candidates,
    set_status,
)


router = APIRouter()


class RepairDecisionBody(BaseModel):
    evidence: list[Evidence] | None = None


def _optional_evidence(
    body: RepairDecisionBody | None,
) -> list[Evidence] | None:
    if body is None:
        return None
    return body.evidence


@router.post(
    "/commitments/{commitment_id}/reevaluate",
    tags=["monitoring"],
)
def reevaluate(
    commitment_id: str,
    body: dict[str, Any] | list[Any] = Body(...),
):
    return reevaluate_commitment(
        commitment_id,
        body,
    )


@router.post(
    "/commitments/reevaluate",
    tags=["monitoring"],
)
def reevaluate_bulk(
    body: dict[str, Any] | list[Any] = Body(...),
    limit: int = 50,
):
    safe_limit = min(max(limit, 1), 200)

    return reevaluate_all(
        body,
        safe_limit,
    )


@router.get(
    "/commitments/{commitment_id}/dependencies",
    tags=["monitoring"],
)
def dependencies(commitment_id: str):
    return dependency_list(commitment_id)


@router.post(
    "/conflicts/check",
    tags=["conflicts"],
)
def conflicts_check(request: ConflictCheckRequest):
    commitment = MarineCommitment.model_validate(
        request.commitment
    )

    conflicts = find_conflicts(commitment)

    return {
        "conflicts": conflicts,
        "blocking": bool(conflicts),
    }


@router.post(
    "/commitments/{commitment_id}/repair",
    tags=["repairs"],
    response_model=RepairProposal,
)
def repair(
    commitment_id: str,
    body: dict,
):
    commitment = get_commitment(commitment_id)

    dependency_id = body.get("dependency_id")
    affected_segments = body.get(
        "affected_segments",
        [],
    )

    if not dependency_id or not affected_segments:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_REPAIR",
                "message": (
                    "dependency_id and "
                    "affected_segments are required"
                ),
            },
        )

    dependency = next(
        (
            item
            for item in commitment.dependencies
            if item.dependency_id == dependency_id
        ),
        None,
    )
    if dependency is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_REPAIR",
                "message": "dependency not found",
            },
        )

    try:
        ranking = rank_candidates(
            generate_candidates(commitment)
        )
        return propose_ranked(
            commitment,
            ranking,
            triggering_dependency_id=dependency_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_REPAIR",
                "message": str(exc),
            },
        ) from exc


@router.get(
    "/commitments/{commitment_id}/repairs",
    tags=["repairs"],
    response_model=list[RepairProposal],
)
def repairs(commitment_id: str):
    return list_repairs(commitment_id)


@router.post(
    "/repairs/{repair_id}/approve",
    tags=["repairs"],
    response_model=RepairProposal,
)
def approve(
    repair_id: str,
    body: RepairDecisionBody | None = Body(default=None),
):
    return set_status(
        repair_id,
        RepairStatus.APPROVED,
        evidence=_optional_evidence(body),
    )


@router.post(
    "/repairs/{repair_id}/reject",
    tags=["repairs"],
    response_model=RepairProposal,
)
def reject(
    repair_id: str,
    body: RepairDecisionBody | None = Body(default=None),
):
    return set_status(
        repair_id,
        RepairStatus.REJECTED,
        evidence=_optional_evidence(body),
    )