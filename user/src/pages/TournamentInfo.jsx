import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Award, BarChart3, CalendarRange } from "lucide-react";
import ScheduleCard from "../components/ScheduleCard";
import PointsTable from "../components/PointsTable";
import TournamentStats from "../components/TournamentStats";
import { ErrorBox, Spinner } from "../components/States";
import { api, unwrap } from "../lib/api";

const TournamentInfo = () => {
  const location = useLocation();
  const { tourname } = useParams();
  const [tournaments, setTournaments] = useState(
    () => location.state?.tourInfo || null
  );
  const [schedule, setSchedule] = useState(null);
  const [points, setPoints] = useState(null);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("fixtures");
  const [loadingList, setLoadingList] = useState(!tournaments);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [pointsError, setPointsError] = useState(null);
  const [statsError, setStatsError] = useState(null);

  // Resolve the tournament from the URL param (name slug or id).
  const tournament = useMemo(() => {
    if (!tournaments || !tourname) return null;
    const decoded = decodeURIComponent(tourname);
    return (
      tournaments.find((ti) => String(ti._id) === decoded) ||
      tournaments.find((ti) => ti.tournament_name === decoded) ||
      tournaments.find(
        (ti) => ti.tournament_name?.split(" ").join("-") === decoded
      ) ||
      null
    );
  }, [tournaments, tourname]);

  const loadList = useCallback(async (signal) => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await api.get("/view/tournaments", { signal });
      setTournaments(unwrap(res) || []);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (tournaments) return;
    const ctrl = new AbortController();
    loadList(ctrl.signal);
    return () => ctrl.abort();
  }, [tournaments, loadList]);

  const loadDetail = useCallback(
    async (id, signal) => {
      setLoadingDetail(true);
      setDetailError(null);
      setPointsError(null);
      setStatsError(null);
      try {
        const res = await api.get(`/view/tournaments/${id}`, { signal });
        setSchedule(unwrap(res) || []);
      } catch (err) {
        if (err?.name !== "AbortError") setDetailError(err.message);
      }
      try {
        const res = await api.get(`/view/tournaments/${id}/points-table`, {
          signal,
        });
        setPoints(unwrap(res) || []);
      } catch (err) {
        if (err?.name !== "AbortError") setPointsError(err.message);
      }
      try {
        const res = await api.get(`/view/tournaments/${id}/stats`, {
          signal,
        });
        setStats(unwrap(res) || null);
      } catch (err) {
        if (err?.name !== "AbortError") setStatsError(err.message);
      } finally {
        setLoadingDetail(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!tournament?._id) return;
    const ctrl = new AbortController();
    setSchedule(null);
    setPoints(null);
    setStats(null);
    loadDetail(tournament._id, ctrl.signal);
    return () => ctrl.abort();
  }, [tournament?._id, loadDetail]);

  if (loadingList) {
    return (
      <div className="min-h-[60vh]">
        <Spinner label="Loading tournament…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh]">
        <ErrorBox message={error} onRetry={() => loadList()} />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-8 text-center">
        <p className="text-xl text-heading font-semibold">
          No tournament found
        </p>
        <p className="text-subheading mt-2">
          The tournament you are looking for does not exist.
        </p>
      </div>
    );
  }

  const t = tournament;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <p className="text-2xl font-bold text-heading font-space">
        {t.tournament_name}
      </p>
      {t.description && (
        <p className="text-sm text-subheading mt-1">{t.description}</p>
      )}
      <p className="text-subheading mt-1">
        {t.start_date ? new Date(t.start_date).toDateString() : ""} -{" "}
        {t.end_date ? new Date(t.end_date).toDateString() : ""}
      </p>
      {t.venue && <p className="text-subheading">{t.venue}</p>}

      {/* tabs */}
      <div
        role="tablist"
        aria-label="Tournament sections"
        className="mt-8 inline-flex flex-row gap-1 p-1.5 rounded-2xl bg-secondary/50 ring-1 ring-black/5 dark:ring-white/10"
      >
        <button
          role="tab"
          aria-selected={tab === "fixtures"}
          onClick={() => setTab("fixtures")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 ${
            tab === "fixtures"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-subheading hover:text-heading hover:bg-card/70"
          }`}
        >
          <CalendarRange size={16} /> Fixtures
        </button>
        <button
          role="tab"
          aria-selected={tab === "points"}
          onClick={() => setTab("points")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 ${
            tab === "points"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-subheading hover:text-heading hover:bg-card/70"
          }`}
        >
          <Award size={16} /> Points Table
        </button>
        <button
          role="tab"
          aria-selected={tab === "stats"}
          onClick={() => setTab("stats")}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer flex items-center gap-2 transition-all duration-200 ${
            tab === "stats"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-subheading hover:text-heading hover:bg-card/70"
          }`}
        >
          <BarChart3 size={16} /> Stats
        </button>
      </div>

      {tab === "fixtures" ? (
        <div className="mt-6">
          {loadingDetail ? (
            <Spinner label="Loading fixtures…" />
          ) : detailError ? (
            <ErrorBox
              message={detailError}
              onRetry={() => loadDetail(t._id)}
            />
          ) : !schedule || schedule.length === 0 ? (
            <p className="text-subheading">No fixtures found.</p>
          ) : (
            <div className="flex flex-col space-y-5 items-center">
              {schedule.map((s) => (
                <ScheduleCard
                  key={s._id}
                  teamA={s.teamA}
                  teamB={s.teamB}
                  date={s.match_date}
                  time={s.match_time}
                  venue={s.venue}
                />
              ))}
            </div>
          )}
        </div>
      ) : tab === "points" ? (
        <div className="mt-6 surface-card p-2 md:p-4">
          <PointsTable
            rows={points}
            loading={loadingDetail && points === null}
            error={pointsError}
            onRetry={() => loadDetail(t._id)}
          />
        </div>
      ) : (
        <div className="mt-6">
          <TournamentStats
            batting={stats?.batting}
            bowling={stats?.bowling}
            loading={loadingDetail && stats === null}
            error={statsError}
            onRetry={() => loadDetail(t._id)}
          />
        </div>
      )}
    </div>
  );
};

export default TournamentInfo;
