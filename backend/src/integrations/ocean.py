from typing import Any

from src.integrations.base import (
    MarineProvider,
    NormalizedEvidence,
    SimulatedProvider,
    UnavailableProvider,
)


class OceanProvider:
    """
    Ocean-data provider facade.

    Supports:
    - a real provider when injected
    - simulated values for development/demo
    - explicit UNKNOWN when no provider is available

    No live ocean data is fabricated.
    """

    def __init__(
        self,
        simulated_values: dict[str, Any] | None = None,
        source: str = "ORCA-OCEAN",
        live_provider: MarineProvider | None = None,
    ) -> None:
        self.source = source
        self._live_provider = live_provider

        self._simulated_provider = (
            SimulatedProvider(
                source=f"{source}-SIMULATED",
                values=simulated_values,
            )
            if simulated_values is not None
            else None
        )

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
            raise ValueError("parameter must not be empty")

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


def create_ocean_provider(
    simulated_values: dict[str, Any] | None = None,
) -> OceanProvider:
    return OceanProvider(
        simulated_values=simulated_values,
        source="ORCA-OCEAN",
    )