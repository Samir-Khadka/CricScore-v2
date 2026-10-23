import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import TournamentsCard from "../components/TournamentsCard";
import { ErrorBox, EmptyBox, Spinner } from "../components/States";
import { api, unwrap } from "../lib/api";

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/view/tournaments", { signal });
      setTournaments(unwrap(res) || []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1400px] mx-auto">
      <div className="mt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-lime-500 shrink-0"
          />
          <h1 className="font-condensed font-semibold uppercase tracking-wide text-4xl leading-none text-heading flex items-center">
            <Trophy size={26} className="mr-3 text-emerald-500" aria-hidden="true" />
            Tournaments
          </h1>
          {!loading && !error && tournaments.length > 0 && (
            <span className="count-pill">
              {tournaments.length}{" "}
              {tournaments.length === 1 ? "tournament" : "tournaments"}
            </span>
          )}
        </div>
        <p className="text-sm text-subheading mt-2 ml-3.5">
          Every tournament running on CricScore.
        </p>
      </div>

      {loading ? (
        <Spinner label="Loading tournaments…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => load()} />
      ) : tournaments.length === 0 ? (
        <div className="mt-8">
          <EmptyBox message="No tournaments found." />
        </div>
      ) : (
        <div className="flex flex-row flex-wrap gap-6 mt-8">
          {tournaments.map((t) => (
            <TournamentsCard
              key={t._id}
              name={t.tournament_name}
              tour={tournaments}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Tournaments;
