from typing import Any

from src.agents.core import ProviderAgent
from src.integrations.weather import WeatherProvider


WEATHER_PARAMETERS: tuple[str, ...] = (
    "wind_speed",
    "wind_direction",
    "temperature",
    "rain_probability",
)


def create_weather_agent(
    simulated_values: dict[str, Any] | None = None,
    live_provider: Any | None = None,
) -> ProviderAgent:
    provider = WeatherProvider(
        simulated_values=simulated_values,
        source="ORCA-WEATHER",
        live_provider=live_provider,
    )

    return ProviderAgent(
        name="weather",
        provider=provider,
        parameters=list(WEATHER_PARAMETERS),
    )