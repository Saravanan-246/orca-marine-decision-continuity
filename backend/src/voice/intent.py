import re
from typing import Any


class VoiceIntentParser:
    """
    Lightweight deterministic voice-intent parser.

    Converts speech text into a normalized ORCA intent object.
    No LLM or paid API is required.
    """

    STAKEHOLDER_KEYWORDS: dict[str, tuple[str, ...]] = {
        "FISHERMAN": (
            "fisherman",
            "fishing",
            "fish",
        ),
        "MARITIME_OPERATOR": (
            "operator",
            "vessel",
            "ship",
            "maritime",
        ),
        "COASTAL_AUTHORITY": (
            "authority",
            "coastal authority",
            "port",
        ),
        "RESEARCHER": (
            "researcher",
            "research",
            "scientist",
        ),
        "EMERGENCY_MANAGER": (
            "emergency",
            "rescue",
            "disaster",
        ),
    }

    DECISION_KEYWORDS: dict[str, tuple[str, ...]] = {
        "FISHING_TRIP": (
            "fishing trip",
            "go fishing",
            "fishing",
        ),
        "ROUTE_PLANNING": (
            "route",
            "path",
            "navigate",
            "navigation",
        ),
        "MARINE_OPERATION": (
            "operation",
            "operate",
            "vessel",
            "sail",
        ),
        "SAFETY_CHECK": (
            "safe",
            "safety",
            "danger",
            "risk",
        ),
        "EMERGENCY_RESPONSE": (
            "emergency",
            "rescue",
            "distress",
        ),
    }

    def parse(
        self,
        text: str,
        location: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not isinstance(text, str):
            raise TypeError("text must be a string")

        normalized = re.sub(
            r"\s+",
            " ",
            text.strip().lower(),
        )

        if not normalized:
            raise ValueError("voice text must not be empty")

        stakeholder = self._detect(
            normalized,
            self.STAKEHOLDER_KEYWORDS,
        )

        decision_type = self._detect(
            normalized,
            self.DECISION_KEYWORDS,
        )

        if stakeholder is None:
            stakeholder = "UNKNOWN"

        if decision_type is None:
            decision_type = "GENERAL_MARINE_QUERY"

        return {
            "raw_text": text,
            "stakeholder_type": stakeholder,
            "decision_type": decision_type,
            "decision_summary": text.strip(),
            "location": location,
        }

    @staticmethod
    def _detect(
        text: str,
        keyword_map: dict[str, tuple[str, ...]],
    ) -> str | None:
        matches: list[tuple[int, str]] = []

        for category, keywords in keyword_map.items():
            for keyword in keywords:
                position = text.find(keyword)

                if position >= 0:
                    matches.append(
                        (
                            position,
                            category,
                        )
                    )

        if not matches:
            return None

        matches.sort(
            key=lambda item: item[0]
        )

        return matches[0][1]


voice_intent_parser = VoiceIntentParser()