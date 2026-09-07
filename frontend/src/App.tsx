import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const lifecycle = [
  "Decision",
  "Commitment",
  "Monitor conditions",
  "Detect impact",
  "Repair with approval",
];

function App() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <Waves size={23} strokeWidth={2} />
          </span>

          <p className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
            ORCA
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      {/* Navigation */}
      <header className="border-b border-slate-100">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="ORCA home"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Waves size={19} strokeWidth={2} />
            </span>

            <span className="text-lg font-semibold tracking-tight">
              ORCA
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
          >
            Sign in
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-7xl items-center px-5 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          {/* Copy */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Marine decision intelligence
            </div>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Decisions that stay aware
              <span className="block text-blue-600">
                when the sea changes.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
              ORCA connects marine evidence, decisions and commitments, then
              keeps watching the conditions that matter.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
              >
                Get started
                <ArrowRight size={17} strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/role")}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:w-auto"
              >
                Explore ORCA
              </button>
            </div>
          </div>

          {/* Product visual */}
          <div className="w-full">
            <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-slate-50 p-2.5 shadow-sm">
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                      ORCA lifecycle
                    </p>

                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                      From a plan to an adaptive decision
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <ShieldCheck size={19} strokeWidth={1.9} />
                  </div>
                </div>

                <div className="mt-7 space-y-2.5">
                  {lifecycle.map((step, index) => (
                    <div
                      key={step}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {index + 1}
                      </span>

                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                        {step}
                      </span>

                      <Check
                        size={16}
                        strokeWidth={2}
                        className="shrink-0 text-blue-600"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl bg-slate-950 px-4 py-4">
                  <p className="text-sm font-semibold text-white">
                    The decision stays connected to its conditions.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    When something changes, ORCA can identify what is affected
                    before proposing a repair.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;