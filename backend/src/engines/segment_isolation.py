from dataclasses import dataclass
from typing import Mapping

from src.engines.dependency_engine import Evaluation
from src.models.commitment import MarineCommitment
from src.models.dependency import DependencyStatus


IMPACTING_STATES = {
    DependencyStatus.AT_RISK,
    DependencyStatus.VIOLATED,
    DependencyStatus.UNVERIFIABLE,
}


@dataclass(frozen=True)
class SegmentIsolationResult:
    commitment_id: str
    affected_segment_ids: tuple[str, ...]
    unaffected_segment_ids: tuple[str, ...]
    triggering_dependency_ids: tuple[str, ...]
    triggering_states: tuple[tuple[str, str], ...]
    unverifiable_dependency_ids: tuple[str, ...]
    unmapped_dependency_ids: tuple[str, ...]
    unknown_segment_ids: tuple[str, ...]
    unevaluated_dependency_ids: tuple[str, ...]
    deterministic: bool
    could_not_evaluate: bool

    def as_dict(self) -> dict[str, object]:
        return {
            "commitment_id": self.commitment_id,
            "affected_segment_ids": list(
                self.affected_segment_ids
            ),
            "unaffected_segment_ids": list(
                self.unaffected_segment_ids
            ),
            "triggering_dependency_ids": list(
                self.triggering_dependency_ids
            ),
            "triggering_states": {
                dependency_id: status
                for dependency_id, status
                in self.triggering_states
            },
            "unverifiable_dependency_ids": list(
                self.unverifiable_dependency_ids
            ),
            "unmapped_dependency_ids": list(
                self.unmapped_dependency_ids
            ),
            "unknown_segment_ids": list(
                self.unknown_segment_ids
            ),
            "unevaluated_dependency_ids": list(
                self.unevaluated_dependency_ids
            ),
            "deterministic": self.deterministic,
            "could_not_evaluate": self.could_not_evaluate,
        }


def isolate_affected_segments(
    commitment: MarineCommitment,
    evaluations: list[Evaluation],
) -> SegmentIsolationResult:
    """
    Map impacting dependency evaluations onto commitment
    segments without mutating the commitment.
    """
    evaluations_by_id: Mapping[str, Evaluation] = {
        item.dependency_id: item
        for item in evaluations
        if item.dependency_id
    }

    segment_order = [
        segment.segment_id
        for segment in commitment.segments
    ]
    known_segments = set(segment_order)

    triggering_ids: list[str] = []
    triggering_states: list[tuple[str, str]] = []
    unverifiable_ids: list[str] = []
    unmapped_ids: list[str] = []
    unknown_ids: list[str] = []
    unevaluated_ids: list[str] = []
    affected: set[str] = set()

    for dependency in commitment.dependencies:
        evaluation = evaluations_by_id.get(
            dependency.dependency_id
        )

        if evaluation is None:
            unevaluated_ids.append(dependency.dependency_id)
            continue

        mapped_ids = list(
            evaluation.affected_segments
            or dependency.segment_ids
        )

        if evaluation.status == DependencyStatus.UNVERIFIABLE:
            unverifiable_ids.append(dependency.dependency_id)

        if evaluation.status not in IMPACTING_STATES:
            continue

        triggering_ids.append(dependency.dependency_id)
        triggering_states.append(
            (
                dependency.dependency_id,
                evaluation.status.value,
            )
        )

        if not mapped_ids:
            unmapped_ids.append(dependency.dependency_id)
            continue

        mapped_known = False

        for segment_id in mapped_ids:
            if segment_id in known_segments:
                affected.add(segment_id)
                mapped_known = True
            elif segment_id not in unknown_ids:
                unknown_ids.append(segment_id)

        if not mapped_known:
            unmapped_ids.append(dependency.dependency_id)

    affected_ids = tuple(
        segment_id
        for segment_id in segment_order
        if segment_id in affected
    )
    unaffected_ids = tuple(
        segment_id
        for segment_id in segment_order
        if segment_id not in affected
    )

    return SegmentIsolationResult(
        commitment_id=commitment.commitment_id,
        affected_segment_ids=affected_ids,
        unaffected_segment_ids=unaffected_ids,
        triggering_dependency_ids=tuple(triggering_ids),
        triggering_states=tuple(triggering_states),
        unverifiable_dependency_ids=tuple(unverifiable_ids),
        unmapped_dependency_ids=tuple(unmapped_ids),
        unknown_segment_ids=tuple(unknown_ids),
        unevaluated_dependency_ids=tuple(unevaluated_ids),
        deterministic=True,
        could_not_evaluate=bool(
            unverifiable_ids or unevaluated_ids
        ),
    )
