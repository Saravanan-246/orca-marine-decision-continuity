from pathlib import Path
from typing import Any

from src.models.decision_context import DecisionContext
from src.services.decision_service import DecisionService, decision_service
from src.voice.intent import VoiceIntentParser, voice_intent_parser
from src.voice.stt import LocalSpeechToText, stt
from src.voice.tts import LocalTextToSpeech, tts


class VoiceService:
    """
    ORCA voice application service.

    Pipeline:

        Audio -> Local STT -> Intent -> DecisionService
              -> DecisionContext -> Safe Response -> Optional TTS

    This layer does not make independent safety decisions.
    Safety/decision rules remain in the deterministic ORCA engines.
    """

    def __init__(
        self,
        speech_to_text: LocalSpeechToText | None = None,
        intent_parser: VoiceIntentParser | None = None,
        decision: DecisionService | None = None,
        text_to_speech: LocalTextToSpeech | None = None,
    ) -> None:
        self.speech_to_text = speech_to_text or stt
        self.intent_parser = intent_parser or voice_intent_parser
        self.decision = decision or decision_service
        self.text_to_speech = text_to_speech or tts

    def transcribe(
        self,
        audio_path: str | Path,
        language: str | None = None,
    ) -> dict[str, Any]:
        return self.speech_to_text.transcribe(
            audio_path=audio_path,
            language=language,
        )

    def parse_text(
        self,
        text: str,
        location: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        text = self._validate_text(text)

        return self.intent_parser.parse(
            text=text,
            location=location,
        )

    def build_context(
        self,
        intent: dict[str, Any],
        agent_names: list[str] | None = None,
    ) -> DecisionContext:
        return self.decision.build_decision_context(
            intent=intent,
            agent_names=agent_names,
        )

    def process_text(
        self,
        text: str,
        location: dict[str, Any] | None = None,
        agent_names: list[str] | None = None,
        speak: bool = False,
    ) -> dict[str, Any]:
        clean_text = self._validate_text(text)

        intent = self.parse_text(
            text=clean_text,
            location=location,
        )

        context = self.build_context(
            intent=intent,
            agent_names=agent_names,
        )

        response = self.format_response(
            intent=intent,
            context=context,
        )

        if speak:
            self.text_to_speech.speak(
                response["speech_text"]
            )

        return {
            "input_text": clean_text,
            "intent": intent,
            "context": context.model_dump(
                mode="json"
            ),
            "response": response,
        }

    def process_audio(
        self,
        audio_path: str | Path,
        language: str | None = None,
        location: dict[str, Any] | None = None,
        agent_names: list[str] | None = None,
        speak: bool = False,
    ) -> dict[str, Any]:
        transcription = self.transcribe(
            audio_path=audio_path,
            language=language,
        )

        text = self._validate_text(
            transcription.get("text", "")
        )

        result = self.process_text(
            text=text,
            location=location,
            agent_names=agent_names,
            speak=speak,
        )

        result["transcription"] = transcription

        return result

    def format_response(
        self,
        intent: dict[str, Any],
        context: DecisionContext,
    ) -> dict[str, Any]:
        state = self._enum_value(
            getattr(context, "state", None)
        )

        data_status = self._enum_value(
            getattr(context, "data_status", None)
        )

        stakeholder = self._clean_label(
            intent.get(
                "stakeholder_type",
                "UNKNOWN",
            )
        )

        decision_type = self._clean_label(
            intent.get(
                "decision_type",
                "GENERAL_MARINE_QUERY",
            )
        )

        evidence = getattr(
            context,
            "evidence_summary",
            [],
        )

        evidence_count = len(evidence)

        # Safety-first interpretation:
        # UNKNOWN data must never be presented as a verified result.
        if data_status == "UNKNOWN":
            status = "UNVERIFIABLE"
            summary = (
                "ORCA cannot safely verify this decision "
                "because required marine data is unavailable."
            )

        elif state == "UNVERIFIABLE":
            status = "UNVERIFIABLE"
            summary = (
                "ORCA cannot safely verify this decision "
                "because critical evidence is missing or unknown."
            )

        elif state == "VIOLATED":
            status = "VIOLATED"
            summary = (
                "ORCA detected a violated decision dependency. "
                "The affected commitment requires review or repair."
            )

        elif state == "AT_RISK":
            status = "AT_RISK"
            summary = (
                "ORCA detected conditions approaching a "
                "decision limit. Review is recommended."
            )

        elif state == "VALID":
            status = "VALID"
            summary = (
                "ORCA evaluated the decision using the "
                "available marine evidence."
            )

        else:
            status = state or "UNKNOWN"
            summary = (
                f"ORCA evaluated the decision with state "
                f"{status}."
            )

        speech_text = (
            f"{stakeholder} "
            f"{decision_type.lower()}. "
            f"{summary}"
        )

        return {
            "status": status,
            "data_status": data_status,
            "stakeholder_type": intent.get(
                "stakeholder_type",
                "UNKNOWN",
            ),
            "decision_type": intent.get(
                "decision_type",
                "GENERAL_MARINE_QUERY",
            ),
            "evidence_count": evidence_count,
            "summary": summary,
            "speech_text": speech_text,
        }

    @staticmethod
    def _validate_text(text: Any) -> str:
        if not isinstance(text, str):
            raise TypeError(
                "voice input must be a string"
            )

        cleaned = " ".join(text.split())

        if not cleaned:
            raise ValueError(
                "voice input must not be empty"
            )

        return cleaned

    @staticmethod
    def _enum_value(value: Any) -> str:
        if value is None:
            return "UNKNOWN"

        return str(
            getattr(value, "value", value)
        )

    @staticmethod
    def _clean_label(value: Any) -> str:
        if not isinstance(value, str):
            return "Unknown"

        cleaned = value.replace("_", " ").strip()

        return cleaned.title() if cleaned else "Unknown"


voice_service = VoiceService()