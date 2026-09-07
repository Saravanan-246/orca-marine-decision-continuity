from typing import Any

from src.agents.orchestrator import ORCAOrchestrator
from src.models.decision_context import DecisionContext


class DecisionService:
    """
    Application-level decision service.

    Provides one stable entry point for:
    - API requests
    - voice requests
    - future mobile clients
    - other ORCA interfaces

    The service delegates evidence collection and context construction
    to the ORCA agent orchestrator. It does not contain safety rules.
    """

    def __init__(
        self,
        orchestrator: ORCAOrchestrator | None = None,
    ) -> None:
        self.orchestrator = orchestrator or ORCAOrchestrator()

    def build_decision_context(
        self,
        intent: dict[str, Any],
        agent_names: list[str] | None = None,
    ) -> DecisionContext:
        if not isinstance(intent, dict):
            raise TypeError("intent must be a dictionary")

        return self.orchestrator.build_context(
            intent=intent,
            agent_names=agent_names,
        )

    def available_agents(self) -> tuple[str, ...]:
        return self.orchestrator.agent_names

    def get_agent(
        self,
        name: str,
    ):
        return self.orchestrator.get_agent(name)


decision_service = DecisionService()