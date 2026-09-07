from typing import Any

from src.agents.core import ProviderAgent
from src.integrations.gis import GISProvider


HAZARD_PARAMETERS: tuple[str, ...] = (
    "hazard_level",
    "storm_warning",
    "restricted_zone",
    "protected_area",
)


def create_hazard_agent(
    simulated_values: dict[str, Any] | None = None,
    live_provider: Any | None = None,
) -> ProviderAgent:
    provider = GISProvider(
        simulated_values=simulated_values,
        source="ORCA-HAZARD",
        live_provider=live_provider,
    )

    return ProviderAgent(
        name="hazard",
        provider=provider,
        parameters=list(HAZARD_PARAMETERS),
    )