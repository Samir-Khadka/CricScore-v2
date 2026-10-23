import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="surface-card w-full max-w-md p-8 md:p-10 text-center">
        <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 ring-2 ring-lime-300/40 shadow-[0_0_18px_rgba(163,230,53,0.4)] text-emerald-950">
          <SearchX size={26} strokeWidth={2.25} />
        </span>
        <p className="mt-5 font-display font-black text-6xl leading-none text-heading tabular-nums">
          404
        </p>
        <h1 className="mt-3 font-condensed font-bold uppercase tracking-wide text-2xl text-heading">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-subheading">
          The page you are looking for does not exist — it may have been
          moved, or the link is mistyped.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            Back to Home
          </Link>
          <Link
            to="/matches/live"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-full text-sm font-semibold text-subheading border-2 border-secondary hover:text-heading transition-colors"
          >
            Live matches
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
