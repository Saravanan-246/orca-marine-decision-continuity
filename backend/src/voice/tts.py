from typing import Any

import pyttsx3


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

    def _create_engine(self) -> Any:
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