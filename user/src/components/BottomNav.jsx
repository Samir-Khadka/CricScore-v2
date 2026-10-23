import { NavLink, useLocation } from "react-router-dom";
import { ClipboardList, Home, Trophy, Zap } from "lucide-react";

/**
 * App-style bottom navigation for small screens (the desktop header
 * carries the same routes on lg+). Hidden where a fixed bottom bar of
 * its own owns the space — the scorer console and organizer flows —
 * and on the login screen.
 */
const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/matches", label: "Matches", icon: Zap },
  { to: "/tournaments", label: "Tournaments", icon: Trophy },
  { to: "/score", label: "Score", icon: ClipboardList },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  if (
    pathname.startsWith("/score/") ||
    pathname.startsWith("/manage") ||
    pathname === "/login"
  ) {
    return null;
  }

  return (
    <>
      {/* clearance so page footers clear the fixed bar */}
      <div aria-hidden="true" className="h-[68px] lg:hidden" />
      <nav aria-label="Primary" className="bottom-nav fixed bottom-0 inset-x-0 z-50 lg:hidden">
      <div className="grid grid-cols-4 max-w-md mx-auto px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-[10px] font-bold tracking-wide transition-colors ${
                  isActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-secondary hover:text-heading"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid place-items-center h-8 w-12 rounded-full transition-colors ${
                      isActive
                        ? "bg-emerald-500/15 ring-1 ring-emerald-500/30"
                        : ""
                    }`}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
      </nav>
    </>
  );
};

export default BottomNav;
