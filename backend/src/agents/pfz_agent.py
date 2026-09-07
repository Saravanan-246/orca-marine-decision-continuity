from typing import Any

from src.agents.core import ProviderAgent
from src.integrations.pfz import PFZProvider


PFZ_PARAMETERS: tuple[str, ...] = (
    "pfz_score",
    "pfz_validity",
    "fish_probability",
    "productive_zone",
)


def create_pfz_agent(
    simulated_values: dict[str, Any] | None = None,
    live_provider: Any | None = None,
) -> ProviderAgent:
    provider = PFZProvider(
        simulated_values=simulated_values,
        source="ORCA-PFZ",
        live_provider=live_provider,
    )

    return ProviderAgent(
        name="pfz",
        provider=provider,
        parameters=list(PFZ_PARAMETERS),
    )