import {
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";

type ConnectionState = "online" | "offline";

function Offline() {
  const [connection, setConnection] =
    useState<ConnectionState>(
      navigator.onLine ? "online" : "offline",
    );

  useEffect(() => {
    const handleOnline = () => setConnection("online");
    const handleOffline = () => setConnection("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isOnline = connection === "online";

  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              isOnline
                ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600",
            ].join(" ")}
          >
            {isOnline ? (
              <Wifi size={21} strokeWidth={1.9} />
            ) : (
              <CloudOff size={21} strokeWidth={1.9} />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
              Fisherman
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Offline
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Check your connection and the information currently available on
              this device.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div
          className={[
            "rounded-xl border px-4 py-4",
            isOnline
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            {isOnline ? (
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
            ) : (
              <CloudOff
                size={19}
                className="mt-0.5 shrink-0 text-amber-600"
              />
            )}

            <div>
              <p className="text-sm font-semibold text-slate-950">
                {isOnline
                  ? "You are connected"
                  : "You are offline"}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {isOnline
                  ? "New information can be requested from connected services."
                  : "Some live marine information may not be available until the connection returns."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-slate-950">
            What remains available
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Availability depends on what has already been stored on this
            device.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          <OfflineRow
            label="Previously viewed information"
            value="Device dependent"
          />

          <OfflineRow
            label="Saved trip draft"
            value="Available"
          />

          <OfflineRow
            label="Live marine updates"
            value={isOnline ? "Available" : "Unavailable"}
          />

          <OfflineRow
            label="Pending synchronization"
            value="No sync queue connected"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <RefreshCw
            size={18}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Reconnect before relying on live conditions
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Marine conditions can change. When live connectivity is
              unavailable, ORCA should not present stale information as
              current.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

function OfflineRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="shrink-0 text-xs font-medium text-slate-400">
        {value}
      </span>
    </div>
  );
}

export default Offline;