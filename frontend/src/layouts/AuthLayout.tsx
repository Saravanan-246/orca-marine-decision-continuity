import type { ReactNode } from "react";
import { Waves } from "lucide-react";
import { useNavigate } from "react-router-dom";

type AuthLayoutProps = {
  children: ReactNode;
};

function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col bg-white sm:my-6 sm:min-h-[calc(100vh-48px)] sm:rounded-3xl sm:border sm:border-slate-200 sm:shadow-sm">
        {/* Minimal auth header */}
        <header className="flex h-16 shrink-0 items-center px-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Go to ORCA home"
            className="flex items-center gap-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Waves size={19} strokeWidth={2} />
            </span>

            <span className="text-lg font-semibold tracking-tight text-slate-950">
              ORCA
            </span>
          </button>
        </header>

        {/* Auth content */}
        <main className="flex min-h-0 flex-1 items-center justify-center px-5 py-8 sm:px-8 sm:py-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthLayout;