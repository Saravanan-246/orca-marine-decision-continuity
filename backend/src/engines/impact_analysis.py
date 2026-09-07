from dataclasses import dataclass
from collections.abc import Mapping

from src.engines.dependency_engine import (
    Evaluation,
    aggregate_dependency_statuses,
)
from src.engines.segment_isolation import (
    SegmentIsolationResult,
    isolate_affected_segments,
)
from src.models.commitment import MarineCommitment
from src.models.dependency import DecisionDependency, DependencyStatus


def _derived_state(statuses: list[DependencyStatus]) -> str:
    aggregated = aggregate_dependency_statuses(statuses)

    if aggregated is None:
        return "VALID"

    return aggregated.value


@dataclass(frozen=True)
class SegmentImpact:
    segment_id: str
    label: str
    triggering_dependency_ids: tuple[str, ...]
    triggering_states: tuple[tuple[str, str], ...]
    operational_impact: str
    reasons: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "segment_id": self.segment_id,
            "label": self.label,
            "triggering_dependency_ids": list(
                self.triggering_dependency_ids
            ),
            "triggering_states": {
                dependency_id: status
                for dependency_id, status
                in self.triggering_states
            },
            "operational_impact": self.operational_impact,
            "reasons": list(self.reasons),
        }


@dataclass(frozen=True)
class ImpactAnalysisResult:
    commitment_id: str
    decision_type: str
    current_commitment_state: str
    proposed_commitment_state: str
    operational_impact: str
    affected_segment_impacts: tuple[SegmentImpact, ...]
    unaffected_segment_ids: tuple[str, ...]
    triggering_dependency_ids: tuple[str, ...]
    isolation: SegmentIsolationResult
    deterministic: bool
    could_not_evaluate: bool

    def as_dict(self) -> dict[str, object]:
        return {
            "commitment_id": self.commitment_id,
            "decision_type": self.decision_type,
            "current_commitment_state": (
                self.current_commitment_state
            ),
            "proposed_commitment_state": (
                self.proposed_commitment_state
            ),
            "operational_impact": self.operational_impact,
            "affected_segment_impacts": [
                item.as_dict()
                for item in self.affected_segment_impacts
            ],
            "unaffected_segment_ids": list(
                self.unaffected_segment_ids
            ),
            "triggering_dependency_ids": list(
                self.triggering_dependency_ids
            ),
            "isolation": self.isolation.as_dict(),
            "deterministic": self.deterministic,
            "could_not_evaluate": self.could_not_evaluate,
        }


def analyze_impact(
    commitment: MarineCommitment,
    evaluations: list[Evaluation],
) -> ImpactAnalysisResult:
    """
    Determine operational impact for isolated segments.

    Does not mutate the commitment and does not generate repairs.
    """
    isolation = isolate_affected_segments(
        commitment,
        evaluations,
    )
    evaluations_by_id: Mapping[str, Evaluation] = {
        item.dependency_id: item
        for item in evaluations
        if item.dependency_id
    }
    dependencies_by_id: Mapping[str, DecisionDependency] = {
        item.dependency_id: item
        for item in commitment.dependencies
    }
    segments_by_id = {
        item.segment_id: item
        for item in commitment.segments
    }

    proposed_state = _derived_state(
        [item.status for item in evaluations]
    )
    operational_impact = _derived_state(
        [
            DependencyStatus(status)
            for _, status in isolation.triggering_states
        ]
    )

    segment_impacts: list[SegmentImpact] = []

    for segment_id in isolation.affected_segment_ids:
        segment = segments_by_id[segment_id]
        triggering_ids: list[str] = []
        triggering_states: list[tuple[str, str]] = []
        reasons: list[str] = []
        statuses: list[DependencyStatus] = []

        for dependency_id, status_value in isolation.triggering_states:
            evaluation = evaluations_by_id.get(dependency_id)
            dependency = dependencies_by_id.get(dependency_id)
            mapped = list(
                (evaluation.affected_segments if evaluation else None)
                or (dependency.segment_ids if dependency else [])
            )

            if segment_id not in mapped:
                continue

            triggering_ids.append(dependency_id)
            triggering_states.append(
                (dependency_id, status_value)
            )
            statuses.append(DependencyStatus(status_value))

            if evaluation is not None and evaluation.reason:
                reasons.append(evaluation.reason)

        segment_impacts.append(
            SegmentImpact(
                segment_id=segment_id,
                label=segment.label,
                triggering_dependency_ids=tuple(triggering_ids),
                triggering_states=tuple(triggering_states),
                operational_impact=_derived_state(
                    statuses
                ),
                reasons=tuple(reasons),
            )
        )

    return ImpactAnalysisResult(
        commitment_id=commitment.commitment_id,
        decision_type=commitment.decision_type,
        current_commitment_state=commitment.state.value,
        proposed_commitment_state=proposed_state,
        operational_impact=operational_impact,
        affected_segment_impacts=tuple(segment_impacts),
        unaffected_segment_ids=isolation.unaffected_segment_ids,
        triggering_dependency_ids=isolation.triggering_dependency_ids,
        isolation=isolation,
        deterministic=True,
        could_not_evaluate=isolation.could_not_evaluate,
    )
