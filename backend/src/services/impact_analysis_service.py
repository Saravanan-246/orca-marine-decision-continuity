from src.engines.dependency_engine import Evaluation
from src.engines.impact_analysis import (
    ImpactAnalysisResult,
    analyze_impact,
)
from src.models.commitment import MarineCommitment
from src.services.segment_isolation_service import (
    evaluations_from_commitment,
)


def analyze_commitment_impact(
    commitment: MarineCommitment,
    evaluations: list[Evaluation] | None = None,
) -> ImpactAnalysisResult:
    """
    Analyze operational impact from evaluation results.

    Does not mutate the commitment.
    """
    items = (
        evaluations
        if evaluations is not None
        else evaluations_from_commitment(commitment)
    )

    return analyze_impact(commitment, items)
