from typing import Any

from src.agents.core import ProviderAgent
from src.integrations.gis import GISProvider


ROUTE_PARAMETERS: tuple[str, ...] = (
    "route_corridor",
    "restricted_zone",
    "protected_area",
    "water_depth",
)


def create_route_agent(
    simulated_values: dict[str, Any] | None = None,
    live_provider: Any | None = None,
) -> ProviderAgent:
    provider = GISProvider(
        simulated_values=simulated_values,
        source="ORCA-ROUTE",
        live_provider=live_provider,
    )

    return ProviderAgent(
        name="route",
        provider=provider,
        parameters=list(ROUTE_PARAMETERS),
    )