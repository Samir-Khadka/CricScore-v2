import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LiveCard from "../components/ScoreSummaryCard";
import LiveDot from "../components/LiveDot";
import UpcomingCard from "../components/Upcoming";
import Recent from "../components/Recent";
import { ErrorBox, EmptyBox, SkeletonCard } from "../components/States";
import { api, homeSocket, unwrap } from "../lib/api";

const VALID_TYPES = ["live", "upcoming", "recent", "completed"];

const TYPE_TABS = [
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "recent", label: "Recent" },
];

const TYPE_SUBTITLES = {
  live: "Every ball, as it happens.",
  upcoming: "Fixtures coming up across your tournaments.",
  recent: "Results and full scorecards from finished matches.",
  completed: "Results and full scorecards from finished matches.",
};

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
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1400px] mx-auto w-full">
      <div className="mt-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="h-8 w-1 rounded-full bg-gradient-to-b from-emerald-400 to-lime-500 shrink-0"
          />
          <h1 className="font-condensed font-extrabold uppercase tracking-wide text-4xl leading-none text-heading flex items-center">
            {type === "live" && <LiveDot className="mr-3" />}
            {type} Matches
          </h1>
          {!loading && !error && (
            <span className="count-pill">
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </span>
          )}
        </div>
        <p className="text-sm text-subheading mt-2 ml-3.5">
          {TYPE_SUBTITLES[type]}
        </p>

        {/* type tabs */}
        <div className="tab-bar mt-5">
          {TYPE_TABS.map((t) => {
            const active =
              type === t.id || (t.id === "recent" && type === "completed");
            return (
              <Link
                key={t.id}
                to={`/matches/${t.id}`}
                aria-current={active ? "page" : undefined}
                className={`tab-item ${active ? "tab-item-active" : ""}`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-row flex-wrap gap-5 justify-center lg:justify-start mt-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorBox message={error} onRetry={() => fetchMatches()} />
      ) : matches.length === 0 ? (
        <div className="mt-8">
          <EmptyBox message="No matches found." />
        </div>
      ) : (
        <div className="flex flex-row flex-wrap gap-5 justify-center lg:justify-start mt-8">
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
