from pathlib import Path
from typing import Any

from faster_whisper import WhisperModel


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
        self._model: WhisperModel | None = None

    @property
    def model(self) -> WhisperModel:
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