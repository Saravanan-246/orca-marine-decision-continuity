import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  Mic,
  MicOff,
  Send,
  Waves,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { readApiError } from "../../api/client";
import { processVoiceText } from "../../api/orca";
import type { VoiceTextResponse } from "../../api/types";
import { buildVoiceContext } from "../../lib/orcaSession";

const VOICE_LANG_KEY = "orca:fisherman:voice-lang";

const VOICE_LANGUAGES = [
  { code: "en-IN", label: "English (India)" },
  { code: "ta-IN", label: "Tamil (India)" },
  { code: "hi-IN", label: "Hindi (India)" },
  { code: "ml-IN", label: "Malayalam (India)" },
  { code: "te-IN", label: "Telugu (India)" },
  { code: "kn-IN", label: "Kannada (India)" },
  { code: "en-US", label: "English (US)" },
] as const;

type VoiceLangCode = (typeof VOICE_LANGUAGES)[number]["code"];

type SpeechRecognitionResultEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorEventLike = Event & {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoicePhase =
  | "ready"
  | "listening"
  | "processing"
  | "response"
  | "mic_unavailable"
  | "speech_unavailable"
  | "error";

function getSpeechCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const speechWindow = window as WindowWithSpeechRecognition;
  return (
    speechWindow.SpeechRecognition ??
    speechWindow.webkitSpeechRecognition ??
    null
  );
}

function readStoredLanguage(): VoiceLangCode {
  try {
    const stored = localStorage.getItem(VOICE_LANG_KEY);
    if (VOICE_LANGUAGES.some((item) => item.code === stored)) {
      return stored as VoiceLangCode;
    }
  } catch {
    /* ignore */
  }
  return "en-IN";
}

function persistLanguage(code: VoiceLangCode): void {
  try {
    localStorage.setItem(VOICE_LANG_KEY, code);
  } catch {
    /* ignore */
  }
}

function languageLabel(code: VoiceLangCode): string {
  return VOICE_LANGUAGES.find((item) => item.code === code)?.label ?? code;
}

function phaseLabel(phase: VoicePhase): string {
  switch (phase) {
    case "ready":
      return "Ready";
    case "listening":
      return "Listening";
    case "processing":
      return "Processing";
    case "response":
      return "Response";
    case "mic_unavailable":
      return "Microphone unavailable";
    case "speech_unavailable":
      return "Speech not supported";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
}

function readTranscript(event: SpeechRecognitionResultEventLike): {
  live: string;
  finalText: string;
} {
  let finalText = "";
  let interim = "";

  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const piece = result?.[0]?.transcript ?? "";
    if (result?.isFinal) {
      finalText += piece;
    } else {
      interim += piece;
    }
  }

  return {
    live: `${finalText}${interim}`.trim(),
    finalText: finalText.trim(),
  };
}

function voiceServiceError(cause: unknown): string {
  if (axios.isAxiosError(cause)) {
    const detail = cause.response?.data as
      | { detail?: { code?: string; message?: string } | string }
      | undefined;
    const payload = detail?.detail;
    const code =
      payload && typeof payload === "object" ? payload.code : undefined;

    if (cause.response?.status === 503 || code === "VOICE_UNAVAILABLE") {
      const serverMessage = readApiError(cause);
      return `ORCA voice is currently unavailable. ${serverMessage}`;
    }
  }

  return readApiError(cause);
}

function Voice() {
  const navigate = useNavigate();
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const submitLockRef = useRef(false);
  const startingRef = useRef(false);
  const listeningRef = useRef(false);
  const abortingRef = useRef(false);
  const unmountedRef = useRef(false);
  const liveRef = useRef("");
  const langRef = useRef<VoiceLangCode>(readStoredLanguage());

  const [speechSupported] = useState(() => Boolean(getSpeechCtor()));
  const [language, setLanguage] = useState<VoiceLangCode>(() =>
    readStoredLanguage(),
  );
  const [phase, setPhase] = useState<VoicePhase>(() =>
    getSpeechCtor() ? "ready" : "speech_unavailable",
  );
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState("");
  const [voiceResult, setVoiceResult] = useState<VoiceTextResponse | null>(
    null,
  );

  const voiceContext = useMemo(() => buildVoiceContext(), [
    voiceResult,
    phase,
  ]);

  const requestText = manualText.trim();
  const busy = phase === "processing";

  const stopRecognition = useCallback((abort = false) => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      listeningRef.current = false;
      startingRef.current = false;
      setListening(false);
      return;
    }

    abortingRef.current = abort;
    try {
      if (abort) {
        recognition.abort();
      } else {
        recognition.stop();
      }
    } catch {
      /* already stopped */
    }
  }, []);

  const detachRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }
    recognitionRef.current = null;
    listeningRef.current = false;
    startingRef.current = false;
    setListening(false);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      abortingRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      detachRecognition();
    };
  }, [detachRecognition]);

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  const startListening = useCallback(() => {
    if (busy || listeningRef.current || startingRef.current) {
      return;
    }

    const Recognition = getSpeechCtor();
    if (!Recognition) {
      setPhase("speech_unavailable");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    stopRecognition(true);
    detachRecognition();

    liveRef.current = "";
    setLiveTranscript("");
    setError("");
    setVoiceResult(null);
    abortingRef.current = false;
    startingRef.current = true;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langRef.current;
    if (typeof recognition.maxAlternatives === "number") {
      recognition.maxAlternatives = 1;
    }

    recognition.onstart = () => {
      if (unmountedRef.current) {
        return;
      }
      startingRef.current = false;
      listeningRef.current = true;
      setListening(true);
      setPhase("listening");
      setError("");
    };

    recognition.onresult = (event) => {
      if (unmountedRef.current) {
        return;
      }
      const { live, finalText } = readTranscript(event);
      liveRef.current = live;
      setLiveTranscript(live);
      if (finalText) {
        setManualText(finalText);
      }
    };

    recognition.onerror = (event) => {
      if (unmountedRef.current) {
        return;
      }

      startingRef.current = false;
      listeningRef.current = false;
      setListening(false);

      if (event.error === "aborted" && abortingRef.current) {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPhase("mic_unavailable");
        setError(
          "Microphone permission was denied. Allow microphone access, or type your request below.",
        );
        return;
      }

      if (event.error === "audio-capture") {
        setPhase("mic_unavailable");
        setError("Microphone unavailable. Check your device and try again, or type your request.");
        return;
      }

      if (event.error === "no-speech") {
        setPhase("error");
        setError("No speech was detected. Tap Listen again and speak clearly.");
        return;
      }

      if (event.error === "network") {
        setPhase("error");
        setError("Speech recognition lost network access. Check your connection and retry.");
        return;
      }

      setPhase("error");
      setError("Voice input could not be completed. You can retry or type your request.");
    };

    recognition.onend = () => {
      if (unmountedRef.current) {
        return;
      }

      startingRef.current = false;
      listeningRef.current = false;
      setListening(false);

      const captured = liveRef.current.trim();
      if (captured) {
        setManualText((current) => current.trim() || captured);
      }

      setPhase((current) => {
        if (
          current === "processing" ||
          current === "response" ||
          current === "mic_unavailable" ||
          current === "speech_unavailable" ||
          current === "error"
        ) {
          return current;
        }
        return "ready";
      });
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      startingRef.current = false;
      listeningRef.current = false;
      setListening(false);
      setPhase("error");
      setError("Voice input is already active. Stop it, then try again.");
    }
  }, [busy, detachRecognition, stopRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition(false);
  }, [stopRecognition]);

  const handleLanguageChange = (code: VoiceLangCode) => {
    setLanguage(code);
    langRef.current = code;
    persistLanguage(code);
    if (listeningRef.current || startingRef.current) {
      stopRecognition(true);
      setPhase("ready");
      setListening(false);
    }
  };

  const clearRequest = () => {
    if (busy) {
      return;
    }
    stopRecognition(true);
    liveRef.current = "";
    setLiveTranscript("");
    setManualText("");
    setVoiceResult(null);
    setError("");
    setPhase(speechSupported ? "ready" : "speech_unavailable");
  };

  const submitToOrca = async () => {
    const text = requestText;
    if (!text || submitLockRef.current || busy) {
      return;
    }

    submitLockRef.current = true;
    setError("");
    setVoiceResult(null);
    setPhase("processing");

    if (listeningRef.current) {
      stopRecognition(false);
    }

    try {
      const context = buildVoiceContext();
      const result = await processVoiceText({
        text,
        latitude: context.location?.lat,
        longitude: context.location?.lon,
        speak: false,
      });
      if (unmountedRef.current) {
        return;
      }
      setVoiceResult(result);
      setPhase("response");
    } catch (cause) {
      if (unmountedRef.current) {
        return;
      }
      setPhase("error");
      setError(voiceServiceError(cause));
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 overflow-x-hidden sm:space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/fisherman")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Home
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Waves size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA voice
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Speak to ORCA
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Speak or type in your language. The recognized text is sent as-is
              to ORCA. No translation is applied here.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Status
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {phaseLabel(phase)}
            </p>
          </div>
          <span
            className={[
              "inline-flex h-2.5 w-2.5 shrink-0 rounded-full",
              phase === "listening"
                ? "animate-pulse bg-red-500"
                : phase === "processing"
                  ? "animate-pulse bg-amber-500"
                  : phase === "response"
                    ? "bg-emerald-500"
                    : phase === "error" || phase === "mic_unavailable"
                      ? "bg-red-400"
                      : "bg-blue-500",
            ].join(" ")}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label htmlFor="voice-language" className="block">
          <span className="text-xs font-medium text-slate-500">
            Speech language
          </span>
          <select
            id="voice-language"
            value={language}
            disabled={busy || listening}
            onChange={(event) =>
              handleLanguageChange(event.target.value as VoiceLangCode)
            }
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            {VOICE_LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Recognition uses the selected browser language. Language is not
          detected automatically.
        </p>
      </section>

      {!speechSupported && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-amber-950">
                Speech recognition is not supported in this browser
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Type your request below and send it to ORCA. Chrome or Edge on
                Android/desktop usually support microphone input.
              </p>
            </div>
          </div>
        </section>
      )}

      {speechSupported && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              disabled={busy}
              aria-label={listening ? "Stop listening" : "Start voice input"}
              className={[
                "flex h-24 w-24 items-center justify-center rounded-full transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
                listening
                  ? "bg-red-500 text-white shadow-[0_0_0_10px_rgba(239,68,68,0.16)] focus:ring-red-100"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100",
              ].join(" ")}
            >
              {listening ? (
                <MicOff size={34} strokeWidth={1.9} />
              ) : (
                <Mic size={34} strokeWidth={1.9} />
              )}
            </button>

            <p className="mt-5 text-base font-semibold text-slate-950">
              {listening ? "Listening..." : "Tap to speak"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {languageLabel(language)} · {language}
            </p>

            {listening && (
              <div className="mt-4 w-full max-w-md rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
                  Live transcript
                </p>
                <p className="mt-1 break-words text-sm leading-6 text-slate-800">
                  {liveTranscript || "Speak now…"}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Trip context sent with request
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Only stored fisherman context is included. Nothing is invented.
          </p>
        </div>

        <div className="grid gap-2 p-4 text-sm sm:grid-cols-2 sm:p-6">
          <ContextRow label="Role" value={voiceContext.role} />
          <ContextRow
            label="Location"
            value={
              voiceContext.location
                ? `${voiceContext.location.lat.toFixed(4)}, ${voiceContext.location.lon.toFixed(4)}`
                : "Not stored"
            }
          />
          <ContextRow
            label="Trip"
            value={voiceContext.tripTitle ?? "Not available"}
          />
          <ContextRow
            label="Route"
            value={voiceContext.tripRoute ?? "Not available"}
          />
          <ContextRow
            label="Commitment"
            value={voiceContext.commitmentId ?? "Not available"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            Recognized text
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Review or edit the text, then send it to ORCA.
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          <label className="block" htmlFor="voice-text">
            <span className="mb-2 block text-xs font-medium text-slate-500">
              Final / manual text
            </span>
            <textarea
              id="voice-text"
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              rows={4}
              disabled={busy}
              placeholder="Speak or type your request here"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={clearRequest}
              disabled={busy}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
            {speechSupported && (
              <button
                type="button"
                onClick={startListening}
                disabled={busy || listening}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Listen again
              </button>
            )}
            <button
              type="button"
              onClick={() => void submitToOrca()}
              disabled={!requestText || listening || busy}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:col-span-1"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} strokeWidth={2} />
              )}
              {busy ? "Processing…" : "Send to ORCA"}
            </button>
          </div>
        </div>
      </section>

      {voiceResult && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50">
          <div className="border-b border-emerald-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-emerald-950">
              ORCA response
            </h2>
            <p className="mt-1 text-xs text-emerald-800/80">
              Real response from POST /voice/text
            </p>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <ResponseBlock
              label="Recognized input"
              value={voiceResult.input_text}
            />
            <ResponseBlock
              label="Status"
              value={`${voiceResult.response.status} · ${voiceResult.response.data_status}`}
            />
            <ResponseBlock
              label="Summary"
              value={voiceResult.response.summary}
            />
            <ResponseBlock
              label="Decision context"
              value={`${voiceResult.response.stakeholder_type} · ${voiceResult.response.decision_type}`}
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-blue-600">
            <Check size={16} strokeWidth={2} />
          </div>
          <h2 className="text-sm font-semibold text-slate-950">
            Useful examples
          </h2>
        </div>
        <div className="mt-4 space-y-2">
          <Example text="Check my fishing trip" />
          <Example text="What changed?" />
          <Example text="Show my fishing area." />
          <Example text="Why did my trip change?" />
        </div>
      </section>
    </section>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function ResponseBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
        {label}
      </p>
      <p className="mt-1 break-words text-sm leading-6 text-emerald-950">
        {value}
      </p>
    </div>
  );
}

function Example({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600">
      “{text}”
    </div>
  );
}

export default Voice;
