import { Link } from "react-router-dom";
import Logo from "./Logo";

const footerLink =
  "text-[13px] text-secondary hover:text-heading transition-colors";

const Footer = () => {
  return (
    <footer className="w-full border-t card-border mt-16">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-8 flex flex-col sm:flex-row sm:items-start gap-8">
        <div className="max-w-xs">
          <div className="flex items-center">
            <Logo size={26} wordmarkClass="text-[15px]" />
          </div>
          <p className="text-[13px] leading-relaxed text-secondary font-inter mt-2.5">
            A real-time cricket scoring platform with live score updates for
            local tournaments.
          </p>
          <div className="text-secondary/70 pt-4 text-xs">
            &copy; {new Date().getFullYear()} CricScore
          </div>
        </div>
        <nav
          className="flex flex-col gap-2.5 sm:ml-auto"
          aria-label="Footer"
        >
          <Link to="/" className={footerLink}>
            Home
          </Link>
          <Link to="/matches/live" className={footerLink}>
            Matches
          </Link>
          <Link to="/tournaments" className={footerLink}>
            Tournaments
          </Link>
          <Link to="/score" className={footerLink}>
            Scorer Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
