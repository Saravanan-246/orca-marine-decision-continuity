from __future__ import annotations

from typing import Any

try:
    import pyttsx3

    _PYTTSX3_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised on Render without voice deps
    pyttsx3 = None  # type: ignore[misc, assignment]
    _PYTTSX3_AVAILABLE = False


class TtsUnavailableError(RuntimeError):
    """Local text-to-speech is not installed or cannot be loaded."""

    def __init__(
        self,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message
            or (
                "voice text-to-speech is unavailable "
                "(pyttsx3 is not installed)"
            ),
        )


def is_tts_available() -> bool:
    return _PYTTSX3_AVAILABLE


class LocalTextToSpeech:
    """
    Local text-to-speech adapter.

    Uses the operating system speech engine.
    No paid API is required.
    """

    def __init__(
        self,
        rate: int = 170,
        volume: float = 1.0,
        voice: str | None = None,
    ) -> None:
        self.rate = rate
        self.volume = max(0.0, min(volume, 1.0))
        self.voice = voice

    def _ensure_available(self) -> None:
        if not _PYTTSX3_AVAILABLE:
            raise TtsUnavailableError()

    def _create_engine(self) -> Any:
        self._ensure_available()

        engine = pyttsx3.init()

        engine.setProperty("rate", self.rate)
        engine.setProperty("volume", self.volume)

        if self.voice:
            for item in engine.getProperty("voices"):
                if self.voice.lower() in str(item.name).lower():
                    engine.setProperty("voice", item.id)
                    break

        return engine

    def speak(self, text: str) -> None:
        if not isinstance(text, str):
            raise TypeError("text must be a string")

        text = text.strip()

        if not text:
            raise ValueError("text must not be empty")

        engine = self._create_engine()

        try:
            engine.say(text)
            engine.runAndWait()
        finally:
            engine.stop()


tts = LocalTextToSpeech()
