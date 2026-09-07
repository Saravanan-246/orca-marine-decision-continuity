from src.engines.dependency_engine import Evaluation
from src.engines.segment_isolation import (
    SegmentIsolationResult,
    isolate_affected_segments,
)
from src.models.commitment import MarineCommitment
from src.models.dependency import DependencyStatus


def evaluations_from_commitment(
    commitment: MarineCommitment,
) -> list[Evaluation]:
    """
    Build evaluation records from stored dependency state.

    Does not re-run threshold checks and does not mutate
    the commitment.
    """
    return [
        Evaluation(
            status=dependency.status,
            reason=f"{dependency.parameter} status is {dependency.status.value}",
            affected_segments=list(dependency.segment_ids),
            dependency_id=dependency.dependency_id,
            current_value=dependency.current_value,
            source=dependency.source,
            observed_at=dependency.observed_at,
        )
        for dependency in commitment.dependencies
    ]


def isolate_commitment_segments(
    commitment: MarineCommitment,
    evaluations: list[Evaluation] | None = None,
) -> SegmentIsolationResult:
    """
    Isolate affected segments for a commitment evaluation.

    Prefer explicit monitoring/evaluation results when
    provided. Does not mutate the commitment.
    """
    items = (
        evaluations
        if evaluations is not None
        else evaluations_from_commitment(commitment)
    )

    return isolate_affected_segments(
        commitment,
        items,
    )


def impacting_status(
    status: DependencyStatus,
) -> bool:
    from src.engines.segment_isolation import IMPACTING_STATES

    return status in IMPACTING_STATES
