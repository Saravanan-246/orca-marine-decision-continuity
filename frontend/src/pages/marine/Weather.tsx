import {
  ArrowLeft,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  MapPinned,
  RefreshCw,
  Sun,
  Wind,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  formatMarineValue,
  formatObservedTime,
  marineFreshnessLabel,
  marineRecordStatus,
  marineSourceLabel,
  marineValueIsLive,
  useLatestMarineState,
} from "../../lib/useLatestMarineState";

function Weather() {
  const navigate = useNavigate();
  const { state, loading, error } = useLatestMarineState();
  const windLive = marineValueIsLive(state?.wind);
  const windText = formatMarineValue(state?.wind);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <button
          type="button"
          onClick={() => navigate("/marine")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Marine
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CloudSun size={21} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Marine
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Weather
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Weather conditions relevant to your current marine area.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Current area
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {marineRecordStatus(state, loading, error)}
            </p>
          </div>

          <MapPinned
            size={19}
            className="text-blue-600"
            strokeWidth={1.9}
          />
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-950">
            {error
              ? "Weather source request failed"
              : windLive
                ? "Wind from connected marine state"
                : "Weather data unavailable"}
          </p>

          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {error
              ? error
              : windLive
                ? `${marineSourceLabel(state)} · observed ${formatObservedTime(state?.timestamp)} · ${marineFreshnessLabel(state)}`
                : "A connected weather source and location are required before ORCA can display current weather information."}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-950">
            Weather conditions
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Values will come directly from the connected marine weather source.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <WeatherMetric
            icon={<Sun size={18} strokeWidth={1.9} />}
            label="Temperature"
          />

          <WeatherMetric
            icon={<Wind size={18} strokeWidth={1.9} />}
            label="Wind"
            value={windText}
            live={windLive}
          />

          <WeatherMetric
            icon={<Droplets size={18} strokeWidth={1.9} />}
            label="Humidity"
          />

          <WeatherMetric
            icon={<Gauge size={18} strokeWidth={1.9} />}
            label="Pressure"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <CloudRain
              size={18}
              strokeWidth={1.9}
              className="text-blue-600"
            />

            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Forecast
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Forecast periods will appear when the provider is connected.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
          <ForecastItem label="Now" />
          <ForecastItem label="Later" />
          <ForecastItem label="Tomorrow" />
          <ForecastItem label="Next day" />
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
        <RefreshCw
          size={16}
          strokeWidth={1.9}
          className="text-slate-400"
        />

        <p className="text-xs leading-5 text-slate-500">
          Temperature, humidity and pressure stay unavailable. Wind is shown
          only from GET /marine/state/latest when that field is REAL or
          SIMULATED.
        </p>
      </div>
    </section>
  );
}

function WeatherMetric({
  icon,
  label,
  value = "Unavailable",
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  live?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <p className="mt-3 text-xs font-medium text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          live ? "text-slate-950" : "text-slate-400",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function ForecastItem({ label }: { label: string }) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-400">
        No data
      </p>
    </div>
  );
}

export default Weather;