from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

from src.models.commitment import MarineCommitment
from src.models.dependency import DecisionDependency
from src.models.repair import RepairOption, RepairProposal


def _preserved_segments(
    commitment: MarineCommitment,
    affected_segments: list[str],
) -> list[str]:
    affected = set(affected_segments)

    return [
        segment.segment_id
        for segment in commitment.segments
        if segment.segment_id not in affected
    ]


def _validate_affected_segments(
    commitment: MarineCommitment,
    affected_segments: list[str],
) -> list[str]:
    if not affected_segments:
        raise ValueError(
            "affected_segments must not be empty"
        )

    normalized = list(
        dict.fromkeys(affected_segments)
    )

    valid_ids = {
        segment.segment_id
        for segment in commitment.segments
    }

    invalid = set(normalized) - valid_ids

    if invalid:
        raise ValueError(
            "unknown affected segment(s): "
            + ", ".join(sorted(invalid))
        )

    return normalized


def _build_options(
    affected_segments: list[str],
) -> list[RepairOption]:
    affected_count = len(affected_segments)

    return [
        RepairOption(
            option_id="OPT-TIME-1",
            repair_type="TIME_SHIFT",
            affected_segments=list(affected_segments),
            changes={
                "shift_hours": 2.0,
            },
            disruption_score=float(
                affected_count
            ),
            reason=(
                "Shift only affected segments so the "
                "condition can be rechecked without "
                "changing unaffected segments."
            ),
        ),
        RepairOption(
            option_id="OPT-ROUTE-1",
            repair_type="ROUTE_SHIFT",
            affected_segments=list(affected_segments),
            changes={
                "route": "alternate safe corridor",
            },
            disruption_score=float(
                affected_count + 1
            ),
            reason=(
                "Move only affected segments to an "
                "alternate corridor when a route change "
                "is less disruptive than changing the schedule."
            ),
        ),
    ]


def _usable_disruption_score(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None

    score = float(value)
    if not isfinite(score):
        return None

    return score


def _disruption_sort_key(
    option_id: str,
    score: float,
) -> tuple[float, str]:
    return (score, option_id)


def _select_minimum_disruption(
    options: list[RepairOption],
) -> RepairOption:
    if not options:
        raise ValueError(
            "repair engine generated no options"
        )

    return min(
        options,
        key=lambda option: _disruption_sort_key(
            option.option_id,
            option.disruption_score,
        ),
    )


def generate_repair(
    commitment: MarineCommitment,
    dependency: DecisionDependency,
    current_value: object,
    affected_segments: list[str],
) -> RepairProposal:
    """
    Generate a deterministic repair proposal.

    The proposal:
    - validates affected segments
    - preserves unaffected segments
    - creates candidate repairs
    - selects the minimum-disruption option
    - records the selected score and reasoning
    """
    normalized_segments = _validate_affected_segments(
        commitment,
        affected_segments,
    )

    preserved = _preserved_segments(
        commitment,
        normalized_segments,
    )

    safe_max = dependency.valid_range.max

    options = _build_options(
        normalized_segments
    )

    selected = _select_minimum_disruption(
        options
    )

    return RepairProposal(
        repair_id=(
            f"RP-{commitment.commitment_id}-"
            f"{dependency.dependency_id}"
        ),
        commitment_id=commitment.commitment_id,
        violated_dependency_id=dependency.dependency_id,
        affected_segments=normalized_segments,
        preserved_segments=preserved,
        options=options,
        selected_option=selected.option_id,
        disruption_score=selected.disruption_score,
        reason=(
            f"{dependency.parameter} changed from "
            f"{dependency.value_at_commit} to "
            f"{current_value}; safe max = {safe_max}. "
            f"Selected {selected.repair_type} because it "
            f"has the lowest disruption score."
        ),
        previous_value=dependency.value_at_commit,
        current_value=current_value,
    )


@dataclass(frozen=True)
class RepairCandidate:
    option_id: str
    repair_type: str
    affected_segments: tuple[str, ...]
    preserved_segments: tuple[str, ...]
    changes: dict
    disruption_score: float
    reason: str
    accepted: bool
    rejection_reason: str | None = None

    def as_dict(self) -> dict:
        return {
            "option_id": self.option_id,
            "repair_type": self.repair_type,
            "affected_segments": list(self.affected_segments),
            "preserved_segments": list(self.preserved_segments),
            "changes": dict(self.changes),
            "disruption_score": self.disruption_score,
            "reason": self.reason,
            "accepted": self.accepted,
            "rejection_reason": self.rejection_reason,
        }


@dataclass(frozen=True)
class RepairCandidateSet:
    commitment_id: str
    triggering_dependency_ids: tuple[str, ...]
    affected_segment_ids: tuple[str, ...]
    unaffected_segment_ids: tuple[str, ...]
    candidates: tuple[RepairCandidate, ...]
    rejected: tuple[RepairCandidate, ...]
    deterministic: bool

    def as_dict(self) -> dict:
        return {
            "commitment_id": self.commitment_id,
            "triggering_dependency_ids": list(
                self.triggering_dependency_ids
            ),
            "affected_segment_ids": list(
                self.affected_segment_ids
            ),
            "unaffected_segment_ids": list(
                self.unaffected_segment_ids
            ),
            "candidates": [
                item.as_dict() for item in self.candidates
            ],
            "rejected": [
                item.as_dict() for item in self.rejected
            ],
            "deterministic": self.deterministic,
        }


@dataclass(frozen=True)
class RepairRanking:
    commitment_id: str
    selected: RepairCandidate | None
    ranked: tuple[RepairCandidate, ...]
    ineligible: tuple[RepairCandidate, ...]
    tie_broken: bool
    deterministic: bool
    affected_segment_ids: tuple[str, ...]
    unaffected_segment_ids: tuple[str, ...]

    def as_dict(self) -> dict:
        return {
            "commitment_id": self.commitment_id,
            "selected": (
                self.selected.as_dict()
                if self.selected is not None
                else None
            ),
            "ranked": [
                item.as_dict() for item in self.ranked
            ],
            "ineligible": [
                item.as_dict() for item in self.ineligible
            ],
            "tie_broken": self.tie_broken,
            "deterministic": self.deterministic,
            "affected_segment_ids": list(
                self.affected_segment_ids
            ),
            "unaffected_segment_ids": list(
                self.unaffected_segment_ids
            ),
        }


def rank_repair_candidates(
    candidate_set: RepairCandidateSet,
) -> RepairRanking:
    """
    Select the minimum-disruption accepted candidate.

    Tie-break is option_id. Rejected and non-finite scores
    are ineligible. Does not apply or persist a repair.
    """
    eligible: list[tuple[float, RepairCandidate]] = []
    ineligible: list[RepairCandidate] = list(
        candidate_set.rejected
    )

    for candidate in candidate_set.candidates:
        if not candidate.accepted:
            ineligible.append(candidate)
            continue

        score = _usable_disruption_score(
            candidate.disruption_score
        )
        if score is None:
            ineligible.append(candidate)
            continue

        eligible.append((score, candidate))

    ranked_pairs = sorted(
        eligible,
        key=lambda item: _disruption_sort_key(
            item[1].option_id,
            item[0],
        ),
    )
    ranked = tuple(item[1] for item in ranked_pairs)
    selected = ranked[0] if ranked else None
    tie_broken = (
        len(ranked_pairs) >= 2
        and ranked_pairs[0][0] == ranked_pairs[1][0]
    )

    return RepairRanking(
        commitment_id=candidate_set.commitment_id,
        selected=selected,
        ranked=ranked,
        ineligible=tuple(ineligible),
        tie_broken=tie_broken,
        deterministic=True,
        affected_segment_ids=candidate_set.affected_segment_ids,
        unaffected_segment_ids=candidate_set.unaffected_segment_ids,
    )


def validate_repair_candidate(
    commitment: MarineCommitment,
    option: RepairOption,
    allowed_affected: list[str],
) -> str | None:
    """
    Deterministic candidate validation.

    Returns a rejection reason, or None if the candidate
    only targets allowed affected segments.
    """
    if not option.option_id.strip():
        return "candidate option_id is empty"

    if not option.repair_type.strip():
        return "candidate repair_type is empty"

    if not option.affected_segments:
        return "candidate has no affected segments"

    known_ids = {
        segment.segment_id
        for segment in commitment.segments
    }
    unknown = [
        segment_id
        for segment_id in option.affected_segments
        if segment_id not in known_ids
    ]
    if unknown:
        return (
            "unknown affected segment(s): "
            + ", ".join(sorted(set(unknown)))
        )

    allowed = set(allowed_affected)
    preserved = {
        segment.segment_id
        for segment in commitment.segments
        if segment.segment_id not in allowed
    }
    touches_unaffected = [
        segment_id
        for segment_id in option.affected_segments
        if segment_id in preserved
    ]
    if touches_unaffected:
        return (
            "candidate would change unaffected segment(s): "
            + ", ".join(sorted(set(touches_unaffected)))
        )

    outside_isolation = [
        segment_id
        for segment_id in option.affected_segments
        if segment_id not in allowed
    ]
    if outside_isolation:
        return (
            "candidate targets segments that are not isolated: "
            + ", ".join(sorted(set(outside_isolation)))
        )

    return None


def generate_repair_candidates(
    commitment: MarineCommitment,
    affected_segments: list[str],
    *,
    triggering_dependency_ids: list[str] | None = None,
    extra_options: list[RepairOption] | None = None,
) -> RepairCandidateSet:
    """
    Generate repair candidates for isolated affected segments.

    Does not apply a repair and does not mutate the commitment.
    Does not select a winner; disruption_score is included
    so a later step can rank candidates.
    """
    known_ids = [
        segment.segment_id
        for segment in commitment.segments
    ]
    requested = list(dict.fromkeys(affected_segments))
    allowed = [
        segment_id
        for segment_id in known_ids
        if segment_id in set(requested)
    ]
    unaffected = tuple(
        segment_id
        for segment_id in known_ids
        if segment_id not in set(allowed)
    )

    if not allowed:
        return RepairCandidateSet(
            commitment_id=commitment.commitment_id,
            triggering_dependency_ids=tuple(
                triggering_dependency_ids or ()
            ),
            affected_segment_ids=(),
            unaffected_segment_ids=tuple(known_ids),
            candidates=(),
            rejected=(),
            deterministic=True,
        )

    options = _build_options(allowed)
    if extra_options:
        options = options + list(extra_options)

    accepted: list[RepairCandidate] = []
    rejected: list[RepairCandidate] = []

    for option in options:
        rejection = validate_repair_candidate(
            commitment,
            option,
            allowed,
        )
        candidate = RepairCandidate(
            option_id=option.option_id,
            repair_type=option.repair_type,
            affected_segments=tuple(option.affected_segments),
            preserved_segments=unaffected,
            changes=dict(option.changes),
            disruption_score=option.disruption_score,
            reason=option.reason,
            accepted=rejection is None,
            rejection_reason=rejection,
        )
        if rejection is None:
            accepted.append(candidate)
        else:
            rejected.append(candidate)

    return RepairCandidateSet(
        commitment_id=commitment.commitment_id,
        triggering_dependency_ids=tuple(
            triggering_dependency_ids or ()
        ),
        affected_segment_ids=tuple(allowed),
        unaffected_segment_ids=unaffected,
        candidates=tuple(accepted),
        rejected=tuple(rejected),
        deterministic=True,
    )