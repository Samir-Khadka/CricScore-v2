import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useThemeSwitch } from "../context/color-mode";
import { getScorerId } from "../lib/api";
import Logo from "./Logo";

const linkClass = ({ isActive }) =>
  `px-3.5 py-2.5 rounded-full text-sm transition-colors duration-200 ${
    isActive
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
      : "text-subheading hover:text-heading hover:bg-secondary/70 font-semibold"
  }`;

const NavBar = () => {
  const { isDark, toggleTheme } = useThemeSwitch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scorerId = getScorerId();

  const closeMenu = () => setMenuOpen(false);

  // The bar turns glassy (blur + deeper shadow) once the page scrolls.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const themeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="btn-icon"
    >
      {isDark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );

  const logo = (
    <Link
      to="/"
      className="flex items-center shrink-0"
      onClick={closeMenu}
      aria-label="CricScore home"
    >
      <Logo size={36} />
    </Link>
  );

  return (
    <nav
      className={`w-full sticky top-0 z-50 glass border-b card-border transition-shadow duration-300 ${
        scrolled ? "shadow-[0_10px_36px_-16px_rgba(0,0,0,0.45)]" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
      />
      <div className="flex flex-row justify-between items-center h-16 px-4 md:px-10 max-w-[1440px] mx-auto w-full">
        {logo}

        {/* desktop nav items */}
        <div className="hidden lg:flex items-center gap-1.5">
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
            className="btn-primary hidden sm:inline-flex"
            onClick={closeMenu}
          >
            Start Scoring
          </Link>
          <button
            type="button"
            className="btn-icon lg:hidden"
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
        <div className="lg:hidden border-t card-border glass px-4 py-3 flex flex-col gap-1 animate-fade-in">
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
            className="btn-primary sm:hidden mt-1 w-full"
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
