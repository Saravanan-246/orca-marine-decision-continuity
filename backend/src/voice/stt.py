from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    from faster_whisper import WhisperModel

    _FASTER_WHISPER_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised on Render without voice deps
    WhisperModel = None  # type: ignore[misc, assignment]
    _FASTER_WHISPER_AVAILABLE = False


class VoiceUnavailableError(RuntimeError):
    """Local speech-to-text is not installed or cannot be loaded."""

    def __init__(
        self,
        message: str | None = None,
    ) -> None:
        super().__init__(
            message
            or (
                "voice speech-to-text is unavailable "
                "(faster-whisper is not installed)"
            ),
        )


def is_stt_available() -> bool:
    return _FASTER_WHISPER_AVAILABLE


class LocalSpeechToText:
    """
    Local, offline-capable speech-to-text using faster-whisper.

    The model is loaded lazily so importing this module does not
    immediately download or initialize a model.
    """

    def __init__(
        self,
        model_size: str = "tiny",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model: Any | None = None

    def _ensure_available(self) -> None:
        if not _FASTER_WHISPER_AVAILABLE:
            raise VoiceUnavailableError()

    @property
    def model(self) -> Any:
        self._ensure_available()

        if self._model is None:
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )

        return self._model

    def transcribe(
        self,
        audio_path: str | Path,
        language: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_available()

        path = Path(audio_path)

        if not path.exists():
            raise FileNotFoundError(
                f"audio file not found: {path}"
            )

        if not path.is_file():
            raise ValueError(
                f"audio path is not a file: {path}"
            )

        segments, info = self.model.transcribe(
            str(path),
            language=language,
            vad_filter=True,
        )

        text_parts: list[str] = []

        for segment in segments:
            text = segment.text.strip()

            if text:
                text_parts.append(text)

        text = " ".join(text_parts).strip()

        return {
            "text": text,
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "model": self.model_size,
            "provider": "LOCAL_WHISPER",
        }


stt = LocalSpeechToText()
