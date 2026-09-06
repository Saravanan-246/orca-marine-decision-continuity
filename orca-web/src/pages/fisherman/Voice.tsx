import {
  AlertCircle,
  ArrowLeft,
  Check,
  Mic,
  MicOff,
  Send,
  Waves,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

type SpeechRecognitionResultEventLike = Event & {
  results: {
    [index: number]: {
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

function Voice() {
  const navigate = useNavigate();

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const speechWindow =
      window as WindowWithSpeechRecognition;

    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      const latestResult =
        event.results[event.results.length - 1];

      if (!latestResult) {
        return;
      }

      setTranscript(latestResult[0]?.transcript ?? "");
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "not-allowed") {
        setError(
          "Microphone permission was denied. Allow microphone access and try again.",
        );
        return;
      }

      if (event.error === "no-speech") {
        setError(
          "No speech was detected. Try speaking again.",
        );
        return;
      }

      setError("Voice input could not be started.");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || !supported) {
      return;
    }

    setError("");
    setTranscript("");

    try {
      recognitionRef.current.start();
    } catch {
      setError("Voice input is already active.");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const submitTranscript = () => {
    const text = transcript.trim();

    if (!text) {
      return;
    }

    navigate("/fisherman/decisions", {
      state: {
        voiceInput: text,
      },
    });
  };

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      {/* Header */}
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

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              ORCA voice
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Speak to ORCA
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ask a question naturally and use the transcript as the starting
              point for the ORCA decision flow.
            </p>
          </div>
        </div>
      </header>

      {!supported ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0 text-amber-600"
            />

            <div>
              <h2 className="text-sm font-semibold text-amber-950">
                Voice input is not available here
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Your browser does not provide the speech recognition feature
                required by this page.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Voice control */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={
                  listening
                    ? stopListening
                    : startListening
                }
                aria-label={
                  listening
                    ? "Stop listening"
                    : "Start voice input"
                }
                className={[
                  "flex h-20 w-20 items-center justify-center rounded-full transition focus:outline-none focus:ring-4",
                  listening
                    ? "bg-red-500 text-white focus:ring-red-100"
                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100",
                ].join(" ")}
              >
                {listening ? (
                  <MicOff
                    size={30}
                    strokeWidth={1.9}
                  />
                ) : (
                  <Mic
                    size={30}
                    strokeWidth={1.9}
                  />
                )}
              </button>

              <p className="mt-5 text-sm font-semibold text-slate-950">
                {listening
                  ? "Listening..."
                  : "Tap to speak"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Try: “Can I go fishing tomorrow morning?”
              </p>

              {listening && (
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Microphone active
                </div>
              )}
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          {/* Transcript */}
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-slate-950">
                Your request
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review the words before sending them to the next ORCA stage.
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {transcript ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm leading-7 text-slate-800">
                    {transcript}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <Mic
                    size={21}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Nothing captured yet
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={submitTranscript}
                disabled={!transcript.trim() || listening}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Send size={16} strokeWidth={2} />
                Continue with request
              </button>
            </div>
          </section>

          {/* Example requests */}
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
              <Example text="Can I go fishing tomorrow morning?" />
              <Example text="What changed?" />
              <Example text="Show my fishing area." />
              <Example text="Why did my trip change?" />
            </div>
          </section>
        </>
      )}
    </section>
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