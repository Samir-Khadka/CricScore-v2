import { useCallback, useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import TournamentsCard from "../components/TournamentsCard";
import { ErrorBox, Spinner } from "../components/States";
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
      <div className="mt-6 text-2xl text-heading font-space font-semibold tracking-wide">
        <Trophy size={22} className="inline-block mr-2 text-[#10b981]" />
        Tournaments
        <p className="text-sm text-subheading mt-1 font-normal font-inter">
          Every tournament running on CricScore.
        </p>
      </div>

      {loading ? (
        <Spinner label="Loading tournaments…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => load()} />
      ) : tournaments.length === 0 ? (
        <p className="text-subheading mt-8">No tournaments found.</p>
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
