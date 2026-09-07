from hashlib import sha256
from typing import Any, Protocol
from src.engines.decision_context_engine import DecisionContextEngine
from src.models.decision_context import DecisionContext
from src.integrations.base import MarineProvider, NormalizedEvidence

class EvidenceAgent(Protocol):
    name: str
    def collect(self, intent: dict[str, Any]) -> list[NormalizedEvidence]: ...

class ProviderAgent:
    def __init__(self, name: str, provider: MarineProvider, parameters: list[str]) -> None:
        self.name, self.provider, self.parameters = name, provider, parameters

    def collect(self, intent: dict[str, Any]) -> list[NormalizedEvidence]:
        return [self.provider.fetch(parameter, intent.get("location")) for parameter in self.parameters]

class DecisionOrchestrator:
    def __init__(self, agents: list[EvidenceAgent], context_engine: DecisionContextEngine | None = None) -> None:
        self.agents = {agent.name: agent for agent in agents}
        self.context_engine = context_engine or DecisionContextEngine()

    def build_context(self, intent: dict[str, Any], agent_names: list[str] | None = None) -> DecisionContext:
        evidence = []
        for name in agent_names or list(self.agents):
            agent = self.agents.get(name)
            if agent:
                evidence.extend(agent.collect(intent))
        normalized = []
        for item in evidence:
            evidence_id = "E-" + sha256(f"{item.source}|{item.parameter}|{item.timestamp.isoformat()}".encode()).hexdigest()[:12]
            normalized.append({"evidence_id": evidence_id, "parameter": item.parameter, "value": item.value, "unit": item.unit, "source": item.source, "observed_at": item.timestamp, "spatial_resolution_km": item.spatial_resolution_km, "temporal_resolution_h": item.temporal_resolution_h, "data_status": item.data_status})
        request = dict(intent)
        request["evidence"] = normalized
        return self.context_engine.create_context(request)
