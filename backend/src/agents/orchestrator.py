from typing import Any

from src.agents.core import DecisionOrchestrator, EvidenceAgent
from src.agents.hazard_agent import create_hazard_agent
from src.agents.ocean_agent import create_ocean_agent
from src.agents.pfz_agent import create_pfz_agent
from src.agents.route_agent import create_route_agent
from src.agents.weather_agent import create_weather_agent
from src.models.decision_context import DecisionContext


class ORCAOrchestrator:
    """
    Coordinates ORCA evidence agents.

    Responsibilities:
    - select requested specialists
    - collect normalized marine evidence
    - build a deterministic DecisionContext

    This class does not make safety decisions.
    """

    DEFAULT_AGENTS = (
        "weather",
        "ocean",
        "pfz",
        "hazard",
        "route",
    )

    def __init__(
        self,
        agents: list[EvidenceAgent] | None = None,
    ) -> None:
        configured_agents = (
            agents
            if agents is not None
            else self._create_default_agents()
        )

        self._agents: dict[str, EvidenceAgent] = {
            agent.name: agent
            for agent in configured_agents
        }

        self._orchestrator = DecisionOrchestrator(
            agents=configured_agents,
        )

    @staticmethod
    def _create_default_agents() -> list[EvidenceAgent]:
        return [
            create_weather_agent(),
            create_ocean_agent(),
            create_pfz_agent(),
            create_hazard_agent(),
            create_route_agent(),
        ]

    @property
    def agent_names(self) -> tuple[str, ...]:
        return tuple(self._agents.keys())

    def get_agent(
        self,
        name: str,
    ) -> EvidenceAgent | None:
        return self._agents.get(name)

    def build_context(
        self,
        intent: dict[str, Any],
        agent_names: list[str] | None = None,
    ) -> DecisionContext:
        requested = (
            list(self.DEFAULT_AGENTS)
            if agent_names is None
            else agent_names
        )

        selected: list[str] = []
        for name in requested:
            normalized_name = name.strip().lower()

            if normalized_name in self._agents:
                selected.append(normalized_name)

        if not selected:
            raise ValueError(
                "no valid ORCA agents selected"
            )

        return self._orchestrator.build_context(
            intent=intent,
            agent_names=selected,
        )


def create_orchestrator(
    agents: list[EvidenceAgent] | None = None,
) -> ORCAOrchestrator:
    return ORCAOrchestrator(agents=agents)