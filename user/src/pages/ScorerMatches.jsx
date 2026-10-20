import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Calendar, Clock, LogOut, MapPin, Play } from "lucide-react";
import { ErrorBox, Spinner } from "../components/States";
import { api, clearScorer, getScorerId, unwrap } from "../lib/api";

const ScorerMatches = () => {
  const navigate = useNavigate();
  const scorerId = getScorerId();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal) => {
      if (!scorerId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/match/${scorerId}`, { signal });
        setMatches(unwrap(res) || []);
      } catch (err) {
        if (err?.name === "AbortError") return;
        // Backend returns 404 when the scorer has no matches yet.
        if (err.status === 404) {
          setMatches([]);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [scorerId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  if (!scorerId) return <Navigate to="/login" replace />;

  const stateBadge = (m) => {
    const s = String(m.matchState || "").toLowerCase();
    if (s === "live")
      return (
        <span className="text-rose-500 font-bold uppercase text-xs flex items-center gap-1.5">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
          Live
        </span>
      );
    if (s === "completed")
      return (
        <span className="text-emerald-500 font-bold uppercase text-xs">
          Completed
        </span>
      );
    return (
      <span className="text-amber-500 font-bold uppercase text-xs">
        {m.matchState || "Upcoming"}
      </span>
    );
  };

  return (
    <section className="px-4 md:px-10 py-6 min-h-screen max-w-[1100px] mx-auto">
      <div className="mt-4 flex flex-row justify-between items-center gap-3">
        <div>
          <p className="text-2xl text-heading font-space font-semibold">
            My Matches
          </p>
          <p className="text-sm text-subheading mt-1">
            Matches you created — tap Score to open the console.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearScorer();
            navigate("/login");
          }}
          className="flex items-center gap-2 px-4 min-h-11 rounded-xl border-2 border-secondary text-subheading font-semibold cursor-pointer shrink-0"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {loading ? (
        <Spinner label="Loading your matches…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => load()} />
      ) : matches.length === 0 ? (
        <div className="mt-10 bg-card border-2 card-border rounded-xl p-8 text-center">
          <p className="text-heading font-semibold">No matches yet</p>
          <p className="text-subheading text-sm mt-2">
            Matches you create in CricScore will appear here for scoring.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {matches.map((m) => (
            <div
              key={m._id}
              className="bg-card border-2 border-[#cc66ff]/40 rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-md"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-space font-bold text-heading capitalize">
                    {m.tournament_name}
                  </p>
                  {stateBadge(m)}
                </div>
                <p className="text-lg font-bold text-heading mt-1">
                  {m.teamA} <span className="text-secondary font-normal">vs</span>{" "}
                  {m.teamB}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-secondary mt-2">
                  {m.match_date && (
                    <span>
                      <Calendar size={13} className="inline" />{" "}
                      {new Date(m.match_date).toDateString()}
                    </span>
                  )}
                  {m.match_time && (
                    <span>
                      <Clock size={13} className="inline" /> {m.match_time}
                    </span>
                  )}
                  {m.venue && (
                    <span>
                      <MapPin size={13} className="inline" /> {m.venue}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  to={`/match/${m._id}`}
                  className="px-4 min-h-12 flex items-center rounded-xl border-2 border-secondary text-subheading font-semibold"
                >
                  View
                </Link>
                <Link
                  to={`/score/${m._id}`}
                  className="px-5 min-h-12 flex items-center gap-2 rounded-xl font-bold text-black bg-gradient-to-r from-[#cc66ff] to-[#00dbde]"
                >
                  <Play size={16} /> Score
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ScorerMatches;
