from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Iterable
from src.models.decision_context import (ContextDataStatus, ContextDependency, ContextEvidence, ContextSegment, ContextState, DecisionContext, EvaluationTrace)

def _stable_id(stakeholder: str, decision_type: str, segments: Iterable[dict[str, Any]]) -> str:
    value = f"{stakeholder}|{decision_type}|{sorted(str(x.get('segment_id')) for x in segments)}"
    return "CTX-" + sha256(value.encode()).hexdigest()[:12]

def _geometry(scope: dict[str, Any] | None) -> dict[str, Any] | None:
    return scope.get("geometry", scope) if scope else None

def _spatial_match(scope: dict[str, Any] | None, candidate: dict[str, Any] | None) -> bool:
    if not scope or not candidate:
        return True
    try:
        from shapely.geometry import shape
        return bool(shape(_geometry(scope)).intersects(shape(_geometry(candidate))))
    except Exception:
        return False

def _temporal_match(start: datetime, end: datetime, timestamp: datetime) -> bool:
    return start <= timestamp <= end

class DecisionContextEngine:
    def create_context(self, request: dict[str, Any]) -> DecisionContext:
        evidence = [ContextEvidence.model_validate(item) for item in request.get("evidence", [])]
        dependencies = [ContextDependency.model_validate(item) for item in request.get("dependencies", [])]
        segments = [ContextSegment.model_validate(item) for item in request.get("segments", [])]
        dependency_index = {item.dependency_id: item for item in dependencies}
        evidence_by_parameter = {item.parameter: item for item in evidence}
        traces: list[EvaluationTrace] = []
        unverifiable = False
        for dependency in dependencies:
            item = evidence_by_parameter.get(dependency.parameter)
            if item is None or item.data_status == ContextDataStatus.UNKNOWN:
                result, reason = "UNVERIFIABLE", "critical evidence is missing or UNKNOWN"
                unverifiable = True
                current = None if item is None else item.value
            else:
                result, reason, current = "VALID", "evidence is available with an explicit data status", item.value
                if item.data_status == ContextDataStatus.SIMULATED:
                    reason = "evidence is SIMULATED and retained as non-real data"
            traces.append(EvaluationTrace(input_used=dependency.parameter, dependency_id=dependency.dependency_id, previous_value=dependency.value_at_commit, current_value=current, threshold_range=dependency.valid_range, result=result, reason=reason))
        statuses = {item.data_status for item in evidence}
        data_status = ContextDataStatus.UNKNOWN if not statuses or ContextDataStatus.UNKNOWN in statuses else ContextDataStatus.SIMULATED if ContextDataStatus.SIMULATED in statuses else next(iter(statuses))
        return DecisionContext(context_id=request.get("context_id") or _stable_id(request["stakeholder_type"], request["decision_type"], request.get("segments", [])), decision_type=request["decision_type"], stakeholder=request["stakeholder_type"], spatial_scope=request.get("spatial_scope"), temporal_scope=request.get("temporal_scope"), segments=segments, evidence_summary=evidence, dependency_index=dependency_index, constraint_summary=request.get("constraints", {}), data_status=data_status, state=ContextState.UNVERIFIABLE if unverifiable else ContextState.VALID, evaluation_trace=traces)

    def update_context(self, context: DecisionContext, marine_state: dict[str, Any], changed_parameter: str | None = None) -> DecisionContext:
        timestamp = marine_state.get("timestamp", datetime.now(timezone.utc))
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        value = marine_state.get(changed_parameter) if changed_parameter else None
        context.version += 1
        context.updated_at = datetime.now(timezone.utc)
        if changed_parameter:
            for dependency in context.dependency_index.values():
                if dependency.parameter != changed_parameter:
                    continue
                affected = self.affected_segments(context, changed_parameter, timestamp, marine_state.get("location"))
                context.evaluation_trace.append(EvaluationTrace(input_used=changed_parameter, dependency_id=dependency.dependency_id, previous_value=dependency.value_at_commit, current_value=value, threshold_range=dependency.valid_range, result="CHANGED", reason=f"updated marine state affects segments {affected}"))
        return context

    def affected_segments(self, context: DecisionContext, parameter: str, timestamp: datetime, location: dict[str, Any] | None = None) -> list[str]:
        candidates = [segment for segment in context.segments if _temporal_match(segment.start_time, segment.end_time, timestamp)]
        dependency_ids = {item.dependency_id for item in context.dependency_index.values() if item.parameter == parameter}
        return [segment.segment_id for segment in candidates if any(segment.segment_id in context.dependency_index[item_id].segment_ids and _spatial_match(context.spatial_scope, location) and _spatial_match(segment.spatial_scope, location) for item_id in dependency_ids)]

    def dependency_ids_for_parameter(self, context: DecisionContext, parameter: str) -> set[str]:
        return {item.dependency_id for item in context.dependency_index.values() if item.parameter == parameter}

    def dependency_ids_for_segment(self, context: DecisionContext, segment_id: str) -> set[str]:
        return {item.dependency_id for item in context.dependency_index.values() if segment_id in item.segment_ids}
