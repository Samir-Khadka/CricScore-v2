import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import LiveCard from "../components/ScoreSummaryCard";
import UpcomingCard from "../components/Upcoming";
import Recent from "../components/Recent";
import { ErrorBox, SkeletonCard } from "../components/States";
import { api, homeSocket, unwrap } from "../lib/api";

const VALID_TYPES = ["live", "upcoming", "recent", "completed"];

const Matches = () => {
  const params = useParams();
  const type = VALID_TYPES.includes(params.type) ? params.type : "live";
  const apiState = type === "recent" ? "completed" : type;

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/view/matches?state=${apiState}`, { signal });
        setMatches(unwrap(res) || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setMatches([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [apiState]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMatches(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchMatches]);

  // The live list updates in real time via the home socket room.
  useEffect(() => {
    if (apiState !== "live") return;
    const socket = homeSocket();
    socket.on("liveMatches", (live) => {
      if (Array.isArray(live)) setMatches(live);
    });
    return () => {
      socket.off("liveMatches");
      socket.disconnect();
    };
  }, [apiState]);

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1400px] mx-auto">
      <div className="mt-6">
        <div className="text-2xl text-heading font-space font-semibold tracking-wide capitalize">
          {type === "live" && (
            <span className="inline-block animate-pulse w-4 h-4 bg-rose-500 rounded-full mr-2 align-middle" />
          )}
          {type} Matches
        </div>
      </div>

      {loading ? (
        <div className="flex flex-row flex-wrap gap-6 justify-evenly mt-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorBox message={error} onRetry={() => fetchMatches()} />
      ) : matches.length === 0 ? (
        <p className="text-subheading mt-8">No matches found.</p>
      ) : (
        <div className="flex flex-row flex-wrap gap-6 justify-evenly mt-8">
          {matches.map((match) =>
            apiState === "live" ? (
              <LiveCard data={match} key={match._id} />
            ) : apiState === "upcoming" ? (
              <UpcomingCard data={match} key={match._id} />
            ) : (
              <Recent data={match} key={match._id} />
            )
          )}
        </div>
      )}
    </section>
  );
};

export default Matches;
