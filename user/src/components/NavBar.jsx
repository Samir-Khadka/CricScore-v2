import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useThemeSwitch } from "../context/color-mode";
import { getScorerId } from "../lib/api";

const linkClass = ({ isActive }) =>
  `hover:text-[#cc66ff] transition-all hover:border-b-3 border-[#cc66ff] ${
    isActive ? "text-[#cc66ff]" : ""
  }`;

const NavBar = () => {
  const { isDark, toggleTheme } = useThemeSwitch();
  const [menuOpen, setMenuOpen] = useState(false);
  const scorerId = getScorerId();

  const closeMenu = () => setMenuOpen(false);

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-lg text-subheading hover:text-[#cc66ff] transition-colors cursor-pointer"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );

  return (
    <nav className="w-full shadow-md bg-card border-b card-border backdrop-blur-sm z-50 sticky top-0">
      <div className="flex flex-row justify-between items-center px-4 md:px-10">
        {/* logo */}
        <Link
          to="/"
          className="py-4 text-2xl font-space font-bold text-heading"
          onClick={closeMenu}
        >
          CricScore
        </Link>

        {/* desktop nav items */}
        <div className="hidden lg:flex items-center gap-8 text-subheading font-semibold">
          <NavLink to="/" className={linkClass} end>
            Home
          </NavLink>
          <NavLink to="/matches/live" className={linkClass}>
            Matches
          </NavLink>
          <NavLink to="/tournaments" className={linkClass}>
            Tournaments
          </NavLink>
          <NavLink to="/score" className={linkClass}>
            My Matches
          </NavLink>
          {themeButton}
        </div>

        {/* actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="lg:hidden">{themeButton}</span>
          <Link
            to={scorerId ? "/score" : "/login"}
            className="hidden sm:inline-block p-3 text-black rounded-xl text-[14px] font-semibold bg-gradient-to-r from-[#cc66ff] to-[#00dbde] cursor-pointer hover:drop-shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300"
            onClick={closeMenu}
          >
            Start Scoring
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-heading cursor-pointer"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t card-border bg-card px-6 py-4 flex flex-col gap-4 text-subheading font-semibold">
          <NavLink to="/" className={linkClass} end onClick={closeMenu}>
            Home
          </NavLink>
          <NavLink to="/matches/live" className={linkClass} onClick={closeMenu}>
            Matches
          </NavLink>
          <NavLink to="/tournaments" className={linkClass} onClick={closeMenu}>
            Tournaments
          </NavLink>
          <NavLink to="/score" className={linkClass} onClick={closeMenu}>
            My Matches
          </NavLink>
          <Link
            to={scorerId ? "/score" : "/login"}
            className="sm:hidden p-3 text-center text-black rounded-xl text-[14px] font-semibold bg-gradient-to-r from-[#cc66ff] to-[#00dbde]"
            onClick={closeMenu}
          >
            Start Scoring
          </Link>
        </div>
      )}
    </nav>
  );
};
export default NavBar;
