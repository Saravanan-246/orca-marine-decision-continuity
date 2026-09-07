from src.agents.core import DecisionOrchestrator, ProviderAgent
from src.integrations.base import SimulatedProvider

def test_orchestrator_hands_evidence_to_context_engine():
    agent = ProviderAgent("ocean", SimulatedProvider("demo", {"wave_height": 1.4}), ["wave_height"])
    intent = {"stakeholder_type":"fisherman", "decision_type":"route", "segments":[], "dependencies":[], "constraints":{}}
    context = DecisionOrchestrator([agent]).build_context(intent)
    assert context.evidence_summary[0].parameter == "wave_height"
    assert context.data_status.value == "SIMULATED"
