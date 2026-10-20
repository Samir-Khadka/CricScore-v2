import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Award, CalendarRange } from "lucide-react";
import ScheduleCard from "../components/ScheduleCard";
import PointsTable from "../components/PointsTable";
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
  const [tab, setTab] = useState("fixtures");
  const [loadingList, setLoadingList] = useState(!tournaments);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);
  const [detailError, setDetailError] = useState(null);
  const [pointsError, setPointsError] = useState(null);

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
        className="mt-8 flex flex-row gap-2"
      >
        <button
          role="tab"
          aria-selected={tab === "fixtures"}
          onClick={() => setTab("fixtures")}
          className={`px-5 py-2.5 rounded-xl font-semibold cursor-pointer flex items-center gap-2 ${
            tab === "fixtures"
              ? "bg-[#af14fd] text-slate-100"
              : "bg-card text-heading border-2 card-border"
          }`}
        >
          <CalendarRange size={16} /> Fixtures
        </button>
        <button
          role="tab"
          aria-selected={tab === "points"}
          onClick={() => setTab("points")}
          className={`px-5 py-2.5 rounded-xl font-semibold cursor-pointer flex items-center gap-2 ${
            tab === "points"
              ? "bg-[#af14fd] text-slate-100"
              : "bg-card text-heading border-2 card-border"
          }`}
        >
          <Award size={16} /> Points Table
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
      ) : (
        <div className="mt-6 bg-card border-2 card-border rounded-xl p-2 md:p-4">
          <PointsTable
            rows={points}
            loading={loadingDetail && points === null}
            error={pointsError}
            onRetry={() => loadDetail(t._id)}
          />
        </div>
      )}
    </div>
  );
};

export default TournamentInfo;
