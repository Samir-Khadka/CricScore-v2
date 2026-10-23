import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Award, BarChart3, CalendarRange, MapPin } from "lucide-react";
import ScheduleCard from "../components/ScheduleCard";
import PointsTable from "../components/PointsTable";
import TournamentStats from "../components/TournamentStats";
import { EmptyBox, ErrorBox, Spinner } from "../components/States";
import { fmtDate } from "../lib/formStyles";
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
      {/* banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-zinc-900 px-6 sm:px-8 py-7 shadow-xl shadow-emerald-950/20">
        <svg
          aria-hidden="true"
          className="absolute -right-8 -top-14 h-60 w-60 text-emerald-400/15"
          viewBox="0 0 48 48"
          fill="none"
        >
          <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M16.8 4.2c-4.6 6-4.6 13.6 0 19.8 4.6 6.2 4.6 13.8 0 19.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="3.4 2.9"
          />
          <path
            d="M31.2 4.2c4.6 6 4.6 13.6 0 19.8-4.6 6.2-4.6 13.8 0 19.8"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="3.4 2.9"
          />
        </svg>
        <div
          aria-hidden="true"
          className="absolute -left-16 -bottom-24 h-56 w-56 rounded-full bg-lime-400/10 blur-3xl"
        />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
            Tournament
          </p>
          <h1 className="mt-2 font-condensed font-bold uppercase tracking-wide text-white text-4xl sm:text-[52px] leading-[0.95]">
            {t.tournament_name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(t.start_date || t.end_date) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-emerald-50 text-[12.5px] font-semibold px-3 py-1.5">
                <CalendarRange size={13} />
                {fmtDate(t.start_date)}
                {t.end_date ? ` — ${fmtDate(t.end_date)}` : ""}
              </span>
            )}
            {t.venue && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-emerald-50 text-[12.5px] font-semibold px-3 py-1.5">
                <MapPin size={13} />
                {t.venue}
              </span>
            )}
            {t.format && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-emerald-50 text-[12.5px] font-semibold px-3 py-1.5">
                {t.format} overs
              </span>
            )}
          </div>
          {t.description && (
            <p className="mt-3.5 text-[14px] leading-relaxed text-emerald-100/75 max-w-2xl">
              {t.description}
            </p>
          )}
        </div>
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="Tournament sections" className="tab-bar mt-8">
        <button
          role="tab"
          aria-selected={tab === "fixtures"}
          onClick={() => setTab("fixtures")}
          className={`tab-item ${tab === "fixtures" ? "tab-item-active" : ""}`}
        >
          <CalendarRange size={16} /> Fixtures
        </button>
        <button
          role="tab"
          aria-selected={tab === "points"}
          onClick={() => setTab("points")}
          className={`tab-item ${tab === "points" ? "tab-item-active" : ""}`}
        >
          <Award size={16} /> Points Table
        </button>
        <button
          role="tab"
          aria-selected={tab === "stats"}
          onClick={() => setTab("stats")}
          className={`tab-item ${tab === "stats" ? "tab-item-active" : ""}`}
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
            <EmptyBox message="No fixtures found." />
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
