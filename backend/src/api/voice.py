from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.voice.service import voice_service
from src.voice.stt import VoiceUnavailableError
from src.voice.tts import TtsUnavailableError


router = APIRouter(tags=["voice"])


@router.post("/voice/text")
def process_voice_text(
    text: str = Form(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    speak: bool = Form(False),
) -> dict:
    location = None

    if latitude is not None and longitude is not None:
        location = {
            "lat": latitude,
            "lon": longitude,
        }

    try:
        return voice_service.process_text(
            text=text,
            location=location,
            speak=speak,
        )
    except (VoiceUnavailableError, TtsUnavailableError) as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "VOICE_UNAVAILABLE",
                "message": str(exc),
            },
        ) from exc
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_VOICE_INPUT",
                "message": str(exc),
            },
        ) from exc


@router.post("/voice/audio")
async def process_voice_audio(
    audio: Annotated[UploadFile, File(...)],
    latitude: Annotated[float | None, Form()] = None,
    longitude: Annotated[float | None, Form()] = None,
    language: Annotated[str | None, Form()] = None,
    speak: Annotated[bool, Form()] = False,
) -> dict:
    if not audio.filename:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_AUDIO",
                "message": "audio filename is required",
            },
        )

    suffix = Path(audio.filename).suffix or ".audio"
    location = None

    if latitude is not None and longitude is not None:
        location = {
            "lat": latitude,
            "lon": longitude,
        }

    temporary_path: str | None = None

    try:
        with NamedTemporaryFile(
            suffix=suffix,
            delete=False,
        ) as temporary:
            temporary_path = temporary.name

            while chunk := await audio.read(1024 * 1024):
                temporary.write(chunk)

        return voice_service.process_audio(
            audio_path=temporary_path,
            language=language,
            location=location,
            speak=speak,
        )

    except (VoiceUnavailableError, TtsUnavailableError) as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "VOICE_UNAVAILABLE",
                "message": str(exc),
            },
        ) from exc
    except (TypeError, ValueError, FileNotFoundError) as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "VOICE_PROCESSING_ERROR",
                "message": str(exc),
            },
        ) from exc

    finally:
        if temporary_path:
            try:
                Path(temporary_path).unlink(
                    missing_ok=True
                )
            except OSError:
                pass