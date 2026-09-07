from datetime import datetime, timezone
from src.engines.decision_context_engine import DecisionContextEngine

NOW = datetime(2026, 1, 1, 9, tzinfo=timezone.utc)

def request(status="REAL"):
    return {"stakeholder_type":"fisherman","decision_type":"route","spatial_scope":{"type":"Polygon","coordinates":[[[0,0],[0,10],[10,10],[10,0],[0,0]]]},"segments":[{"segment_id":"SEG-1","start_time":NOW,"end_time":NOW.replace(hour=10)},{"segment_id":"SEG-2","start_time":NOW.replace(hour=10),"end_time":NOW.replace(hour=12)},{"segment_id":"SEG-3","start_time":NOW.replace(hour=12),"end_time":NOW.replace(hour=13)}],"dependencies":[{"dependency_id":"D-WAVE","parameter":"wave_height","value_at_commit":1.4,"valid_range":{"max":2},"segment_ids":["SEG-3"]},{"dependency_id":"D-WIND","parameter":"wind_speed","value_at_commit":12,"valid_range":{"max":18},"segment_ids":["SEG-1","SEG-2"]}],"evidence":[{"evidence_id":"E-WAVE","parameter":"wave_height","source":"test","value":1.4,"unit":"m","observed_at":NOW,"data_status":status},{"evidence_id":"E-WIND","parameter":"wind_speed","source":"test","value":12,"unit":"kn","observed_at":NOW,"data_status":status}]}

def test_context_indexes_and_trace():
    engine = DecisionContextEngine(); context = engine.create_context(request())
    assert context.dependency_index["D-WAVE"].parameter == "wave_height"
    assert engine.dependency_ids_for_parameter(context, "wind_speed") == {"D-WIND"}
    assert engine.dependency_ids_for_segment(context, "SEG-2") == {"D-WIND"}
    assert len(context.evaluation_trace) == 2

def test_temporal_spatial_and_affected_segment_lookup():
    engine = DecisionContextEngine(); context = engine.create_context(request()); point = {"type":"Point","coordinates":[5,5]}
    assert engine.affected_segments(context, "wave_height", NOW.replace(hour=12, minute=30), point) == ["SEG-3"]
    assert engine.affected_segments(context, "wave_height", NOW.replace(hour=11), point) == []
    assert engine.affected_segments(context, "wave_height", NOW.replace(hour=12, minute=30), {"type":"Point","coordinates":[50,50]}) == []

def test_missing_unknown_and_simulated_evidence_are_not_real():
    engine = DecisionContextEngine(); missing = request(); missing["evidence"] = []
    assert engine.create_context(missing).state.value == "UNVERIFIABLE"
    assert engine.create_context(request("UNKNOWN")).state.value == "UNVERIFIABLE"
    simulated = engine.create_context(request("SIMULATED"))
    assert simulated.data_status.value == "SIMULATED" and simulated.state.value == "VALID"

def test_repeated_evaluation_and_version_increment():
    engine = DecisionContextEngine(); context_a = engine.create_context(request()); context_b = engine.create_context(request())
    assert context_a.context_id == context_b.context_id
    stable_a = [{k: v for k, v in x.model_dump(mode="json").items() if k != "timestamp"} for x in context_a.evaluation_trace]
    stable_b = [{k: v for k, v in x.model_dump(mode="json").items() if k != "timestamp"} for x in context_b.evaluation_trace]
    assert stable_a == stable_b
    revised = engine.update_context(context_a, {"timestamp":NOW.replace(hour=12, minute=30),"location":{"type":"Point","coordinates":[5,5]},"wave_height":2.3}, "wave_height")
    assert revised.version == 2 and revised.evaluation_trace[-1].current_value == 2.3
