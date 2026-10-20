import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full bg-card border-t card-border mt-10 p-6 flex flex-col sm:flex-row gap-10 px-6 md:pl-10">
      <div>
        <header className="text-xl text-heading font-space">CricScore</header>
        <p className="text-sm text-subheading font-inter mt-2">
          A real-time cricket scoring platform with real-time score updates.
        </p>
        <div className="text-secondary pt-10 text-sm">&copy; CricScore</div>
      </div>
      <div className="flex flex-col text-subheading text-sm space-y-3">
        <Link to="/" className="hover:text-[#cc66ff] transition-colors">
          Home
        </Link>
        <Link
          to="/matches/live"
          className="hover:text-[#cc66ff] transition-colors"
        >
          Matches
        </Link>
        <Link
          to="/tournaments"
          className="hover:text-[#cc66ff] transition-colors"
        >
          Tournaments
        </Link>
        <Link to="/score" className="hover:text-[#cc66ff] transition-colors">
          Scorer Dashboard
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
