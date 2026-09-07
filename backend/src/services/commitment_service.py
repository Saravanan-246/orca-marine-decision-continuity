from fastapi import HTTPException
from pydantic import ValidationError

from src.core.database import db
from src.engines.conflict_engine import check_pair
from src.models.commitment import CommitmentState, MarineCommitment
from src.services.dependency_service import (
    apply_dependency_evaluations,
    derive_commitment_state,
    evaluate_commitment_dependencies,
)
from src.services.repository_helpers import replace_one


def _load_existing_commitments() -> list[MarineCommitment]:
    loaded: list[MarineCommitment] = []

    for item in db.collection("commitments").find({}):
        payload = {
            key: value
            for key, value in item.items()
            if key != "_id"
        }
        try:
            loaded.append(MarineCommitment.model_validate(payload))
        except ValidationError:
            continue

    return loaded


def _validate_commitment(commitment: MarineCommitment) -> None:
    if not commitment.commitment_id.strip():
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_COMMITMENT",
                "message": "commitment_id must not be empty",
            },
        )

    if not commitment.segments:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_COMMITMENT",
                "message": "At least one segment is required",
            },
        )

    segment_ids = [
        segment.segment_id
        for segment in commitment.segments
    ]

    if len(segment_ids) != len(set(segment_ids)):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_COMMITMENT",
                "message": "segment_id values must be unique",
            },
        )


def _evaluate_dependencies(
    commitment: MarineCommitment,
) -> None:
    evaluations = evaluate_commitment_dependencies(
        commitment,
        as_of=commitment.created_at,
    )
    apply_dependency_evaluations(commitment, evaluations)


def _derive_state(
    commitment: MarineCommitment,
) -> CommitmentState:
    return derive_commitment_state(
        [
            dependency.status
            for dependency in commitment.dependencies
        ]
    )


def _check_conflicts(
    commitment: MarineCommitment,
) -> None:
    for existing in _load_existing_commitments():
        if existing.commitment_id == commitment.commitment_id:
            continue

        result = check_pair(
            commitment,
            existing,
        )

        if result.conflict:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "COMMITMENT_CONFLICT",
                    "message": (
                        "commitment conflicts with an "
                        "existing operational commitment"
                    ),
                    "conflict": result.model_dump(
                        mode="json"
                    ),
                },
            )


def create_commitment(
    commitment: MarineCommitment,
) -> MarineCommitment:
    _validate_commitment(commitment)

    existing = db.collection(
        "commitments"
    ).find_one(
        {"commitment_id": commitment.commitment_id}
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "COMMITMENT_EXISTS",
                "message": (
                    f"Commitment "
                    f"{commitment.commitment_id} "
                    "already exists"
                ),
            },
        )

    _check_conflicts(commitment)
    _evaluate_dependencies(commitment)

    commitment.state = _derive_state(
        commitment
    )

    db.collection("commitments").insert_one(
        {
            "_id": commitment.commitment_id,
            **commitment.model_dump(mode="json"),
        }
    )

    return commitment


def get_commitment(
    commitment_id: str,
) -> MarineCommitment:
    item = db.collection(
        "commitments"
    ).find_one(
        {"commitment_id": commitment_id}
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "COMMITMENT_NOT_FOUND",
                "message": (
                    f"Commitment {commitment_id} "
                    "was not found"
                ),
            },
        )

    item.pop("_id", None)

    return MarineCommitment.model_validate(
        item
    )


def list_commitments(
    limit: int = 50,
    offset: int = 0,
) -> list[MarineCommitment]:
    safe_limit = min(
        max(limit, 1),
        200,
    )
    safe_offset = max(offset, 0)

    items = db.collection(
        "commitments"
    ).find({})

    page = items[
        safe_offset:
        safe_offset + safe_limit
    ]

    return [
        MarineCommitment.model_validate(
            {
                key: value
                for key, value in item.items()
                if key != "_id"
            }
        )
        for item in page
    ]