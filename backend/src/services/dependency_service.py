from datetime import datetime, timezone

from src.engines.dependency_engine import (
    Evaluation,
    aggregate_dependency_statuses,
    evaluate_dependencies,
)
from src.models.commitment import CommitmentState, MarineCommitment
from src.models.dependency import DependencyStatus
from src.models.evidence import Evidence


def evaluate_commitment_dependencies(
    commitment: MarineCommitment,
    *,
    evidence: list[Evidence] | None = None,
    as_of: datetime | None = None,
) -> list[Evaluation]:
    """
    Evaluate every dependency against evidence.

    This function does not mutate the commitment.
    """
    items = (
        evidence
        if evidence is not None
        else commitment.evidence
    )

    return evaluate_dependencies(
        commitment.dependencies,
        items,
        as_of=as_of or datetime.now(timezone.utc),
    )


def derive_commitment_state(
    statuses: list[DependencyStatus],
) -> CommitmentState:
    aggregated = aggregate_dependency_statuses(statuses)

    if aggregated is None:
        return CommitmentState.VALID

    return CommitmentState(aggregated.value)


def apply_dependency_evaluations(
    commitment: MarineCommitment,
    evaluations: list[Evaluation],
) -> MarineCommitment:
    """
    Explicitly copy evaluation status onto dependencies.

    Does not change commitment state, values at commit,
    or persistence.
    """
    by_id = {
        item.dependency_id: item
        for item in evaluations
        if item.dependency_id
    }

    for dependency in commitment.dependencies:
        result = by_id.get(dependency.dependency_id)
        if result is None:
            continue

        dependency.status = result.status

    return commitment
