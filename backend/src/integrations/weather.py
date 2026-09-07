from typing import Any

from src.integrations.base import (
    MarineProvider,
    NormalizedEvidence,
    SimulatedProvider,
    UnavailableProvider,
)


class WeatherProvider:
    """
    Weather provider facade.

    Uses a simulated provider when demo values are supplied.
    Falls back to an unavailable provider when no live provider
    is configured.

    No live data is fabricated.
    """

    def __init__(
        self,
        simulated_values: dict[str, Any] | None = None,
        source: str = "ORCA-WEATHER",
        live_provider: MarineProvider | None = None,
    ) -> None:
        self.source = source
        self._live_provider = live_provider

        if simulated_values is not None:
            self._simulated_provider = SimulatedProvider(
                source=f"{source}-SIMULATED",
                values=simulated_values,
            )
        else:
            self._simulated_provider = None

        self._unavailable_provider = UnavailableProvider(
            source=f"{source}-UNAVAILABLE"
        )

    def fetch(
        self,
        parameter: str,
        location: dict[str, Any] | None = None,
    ) -> NormalizedEvidence:
        parameter = parameter.strip()

        if not parameter:
            raise ValueError(
                "parameter must not be empty"
            )

        if self._live_provider is not None:
            return self._live_provider.fetch(
                parameter,
                location,
            )

        if self._simulated_provider is not None:
            return self._simulated_provider.fetch(
                parameter,
                location,
            )

        return self._unavailable_provider.fetch(
            parameter,
            location,
        )


def create_weather_provider(
    simulated_values: dict[str, Any] | None = None,
) -> WeatherProvider:
    return WeatherProvider(
        simulated_values=simulated_values,
        source="ORCA-WEATHER",
    )