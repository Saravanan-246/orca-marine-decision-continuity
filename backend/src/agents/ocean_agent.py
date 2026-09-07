from typing import Any

from src.agents.core import ProviderAgent
from src.integrations.ocean import OceanProvider


OCEAN_PARAMETERS: tuple[str, ...] = (
    "wave_height",
    "current_speed",
    "sea_surface_temperature",
    "water_depth",
)


def create_ocean_agent(
    simulated_values: dict[str, Any] | None = None,
    live_provider: Any | None = None,
) -> ProviderAgent:
    provider = OceanProvider(
        simulated_values=simulated_values,
        source="ORCA-OCEAN",
        live_provider=live_provider,
    )

    return ProviderAgent(
        name="ocean",
        provider=provider,
        parameters=list(OCEAN_PARAMETERS),
    )