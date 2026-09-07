import {
  Compass,
  FileText,
  Home,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  label: string;
  path: string;
  icon: typeof Home;
};

const navItems: NavItem[] = [
  {
    label: "Home",
    path: "/fisherman",
    icon: Home,
  },
  {
    label: "Map",
    path: "/fisherman/map",
    icon: Compass,
  },
  {
    label: "Decisions",
    path: "/fisherman/decisions",
    icon: FileText,
  },
  {
    label: "Commitments",
    path: "/fisherman/commitment",
    icon: ShieldCheck,
  },
  {
    label: "Voice",
    path: "/fisherman/voice",
    icon: Mic,
  },
];

function isActive(pathname: string, itemPath: string) {
  if (itemPath === "/fisherman") {
    return pathname === "/fisherman";
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Primary navigation"
      className="
        fixed
        inset-x-0
        bottom-0
        z-[3000]
        border-t
        border-slate-200
        bg-white
        pb-[env(safe-area-inset-bottom)]
      "
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid h-[72px] grid-cols-5 px-1 sm:px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(location.pathname, item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className="
                  flex
                  min-w-0
                  flex-col
                  items-center
                  justify-center
                  gap-1
                  px-1
                  text-center
                  focus:outline-none
                "
              >
                <span
                  className={[
                    "flex h-9 min-w-9 items-center justify-center rounded-xl px-2 transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-700",
                  ].join(" ")}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.2 : 1.9}
                  />
                </span>

                <span
                  className={[
                    "max-w-full truncate text-[11px] leading-none",
                    active
                      ? "font-semibold text-blue-600"
                      : "font-medium text-slate-400",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
