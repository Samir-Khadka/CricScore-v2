import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import {
  findInnings,
  fmt2,
  inningsView,
  matchFormat,
  teamColorHex,
} from "../lib/cricket";
import TeamChip from "./TeamChip";
import LiveDot from "./LiveDot";
import TimelineItem from "./TimelineItem";
import WinMeter from "./WinMeter";

/**
 * Hero featured-match panel. Renders from the list payload immediately and
 * upgrades to the detail payload (engine state) when it arrives — that is
 * what unlocks the this-over strip and the win-probability meter.
 * Props: { match, detail, variant: "live" | "recent" }
 */
const FeaturedMatch = ({ match, detail, variant }) => {
  const m = detail?.match || match;
  if (!m) return null;

  const format = matchFormat(m);
  const isLive = variant === "live";

  // Normalised innings views, from detail states when available.
  const detailInnings = detail?.innings || [];
  let teamAView = null;
  let teamBView = null;
  let activeView = null;
  let activeEntry = null;

  if (detailInnings.length > 0) {
    const views = detailInnings.map((d) => inningsView(d?.inning, d?.state));
    const byTeam = (id) => {
      const i = detailInnings.findIndex(
        (d) => String(d?.inning?.batting_team) === String(id)
      );
      return i >= 0 ? views[i] : null;
    };
    teamAView = byTeam(m.teamA_id);
    teamBView = byTeam(m.teamB_id);
    const liveIdx = detailInnings.findIndex(
      (d) => d?.inning?.status === "inProgress"
    );
    const idx = liveIdx >= 0 ? liveIdx : detailInnings.length - 1;
    activeEntry = detailInnings[idx];
    activeView = views[idx];
  } else {
    const aDoc = findInnings(m, m.teamA_id);
    const bDoc = findInnings(m, m.teamB_id);
    teamAView = inningsView(aDoc, null);
    teamBView = inningsView(bDoc, null);
    activeView =
      m.inning_in_progress === 2
        ? teamBView || teamAView
        : teamAView || teamBView;
  }

  // Win probability for team A — mirrors the match page: live chases read
  // the engine state; a completed match settles at 100/0 from the winner.
  let winAPct = null;
  if (!isLive && m.winner) {
    winAPct = String(m.winner) === String(m.teamA_id) ? 100 : 0;
  } else if (activeEntry?.state?.winProbability) {
    const wp = activeEntry.state.winProbability;
    const battingIsA =
      String(activeEntry.inning?.batting_team) === String(m.teamA_id);
    winAPct = battingIsA ? wp.batting : wp.bowling;
  }

  const battingId = activeView?.battingTeam;
  // Innings progress for the live hero: overs bowled of the allocation.
  const progressPct =
    isLive && format && activeView
      ? Math.min(100, Math.round((activeView.legalBalls / (format * 6)) * 100))
      : null;
  const scoreRow = (name, id, view) => (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-3 rounded-2xl ${
        isLive && battingId && String(battingId) === String(id)
          ? "bg-emerald-500/[0.07] ring-1 ring-emerald-500/20"
          : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TeamChip name={name} size="xl" />
        <span className="font-condensed font-bold uppercase text-[26px] leading-none tracking-wide text-heading truncate">
          {name}
        </span>
        {isLive && battingId && String(battingId) === String(id) && (
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        )}
      </div>
      {view ? (
        <div className="text-right shrink-0">
          <span
            key={`${view.runs}/${view.wickets}`}
            className="animate-score-pop inline-block font-display font-black text-[42px] sm:text-[50px] leading-none tabular-nums text-heading"
          >
            {view.runs}
            <span className="text-subheading font-extrabold">/{view.wickets}</span>
          </span>
          <span className="block text-[12px] font-bold text-subheading tabular-nums mt-1">
            {view.oversText}
            {format ? `/${format}` : ""} overs
          </span>
        </div>
      ) : (
        <span className="text-sm font-medium text-subheading">Yet to bat</span>
      )}
    </div>
  );

  const chaseLine =
    isLive && activeView
      ? activeView.target && activeView.runsNeeded != null
        ? `Need ${activeView.runsNeeded} off ${activeView.ballsRemaining ?? "—"} balls`
        : null
      : null;

  return (
    <Link
      to={m._id ? `/match/${m._id}` : "#"}
      className={`surface-card card-link block overflow-hidden group ${
        isLive ? "live-glow" : ""
      }`}
    >
      {/* team colour bar — the two colours meet mid-card */}
      <div
        className="h-1.5"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(90deg, ${teamColorHex(m.teamA)} 0%, ${teamColorHex(m.teamA)} 42%, ${teamColorHex(m.teamB)} 58%, ${teamColorHex(m.teamB)} 100%)`,
        }}
      />

      <div className="p-4 sm:p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400 truncate">
              {m.tournament_name}
            </p>
            <p className="text-subheading text-[13px] mt-1 flex items-center gap-1 truncate">
              <MapPin size={13} className="shrink-0" />
              <span className="truncate">{m.venue}</span>
            </p>
          </div>
          {isLive ? (
            <span className="live-badge shrink-0">
              <LiveDot /> LIVE
            </span>
          ) : (
            <span className="text-[11px] font-black tracking-[0.16em] text-secondary shrink-0 pt-1.5">
              RESULT
            </span>
          )}
        </div>

        {/* scores */}
        <div className="mt-3 space-y-1.5">
          {scoreRow(m.teamA, m.teamA_id, teamAView)}
          {scoreRow(m.teamB, m.teamB_id, teamBView)}
        </div>

        {/* innings progress */}
        {progressPct !== null && (
          <div className="mt-3.5 px-1">
            <div
              className="progress-track"
              role="img"
              aria-label={`Innings progress: over ${activeView.oversText} of ${format}, ${progressPct} percent bowled`}
            >
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary tabular-nums">
              Over {activeView.oversText} of {format} · {progressPct}% bowled
            </p>
          </div>
        )}

        {/* status line */}
        {isLive && activeView && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t card-border pt-3 text-[13px] font-semibold text-subheading tabular-nums">
            {chaseLine && (
              <span className="font-bold text-emerald-700 dark:text-lime-300">
                {chaseLine}
              </span>
            )}
            <span>
              CRR{" "}
              <span className="text-heading font-space">
                {fmt2(activeView.crr)}
              </span>
            </span>
            {activeView.rrr != null && (
              <span>
                RRR{" "}
                <span className="text-heading font-space">
                  {fmt2(activeView.rrr)}
                </span>
              </span>
            )}
            {!activeView.target && activeView.projectedScore != null && (
              <span>
                Proj{" "}
                <span className="text-heading font-space">
                  {Math.round(activeView.projectedScore)}
                </span>
              </span>
            )}
          </div>
        )}
        {!isLive && m.result && (
          <p className="heading-gradient mt-3 border-t card-border pt-3.5 font-condensed italic font-bold uppercase tracking-wide text-[24px] leading-tight">
            {m.result}
          </p>
        )}

        {/* this over */}
        {isLive && activeView?.thisOver?.length > 0 && (
          <div className="flex items-center flex-wrap mt-3 border-t card-border pt-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary mr-1.5">
              This over
            </span>
            {activeView.thisOver.map((s, i) => (
              <TimelineItem key={i} result={s} />
            ))}
          </div>
        )}

        {/* win meter */}
        {winAPct != null && (
          <div className="mt-4 border-t card-border pt-3.5">
            <WinMeter teamA={m.teamA} teamB={m.teamB} teamAPct={winAPct} />
          </div>
        )}

        <div className="mt-4 flex items-center gap-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:gap-2.5 transition-[gap] duration-200">
          Full scorecard
          <ArrowRight size={15} />
        </div>
      </div>
    </Link>
  );
};

/**
 * Stylised product visual shown in the hero when there is no match data
 * yet. Clearly a preview — it demonstrates the live panel, not real data.
 */
export const FeaturedMatchMock = () => {
  const thisOver = ["1", "4", "•", "6", "1", "W"];
  const row = (name, score, wkts, overs, batting) => (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-3 rounded-2xl ${
        batting
          ? "bg-emerald-500/[0.07] ring-1 ring-emerald-500/20"
          : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <TeamChip name={name} size="xl" />
        <span className="font-condensed font-bold uppercase text-[26px] leading-none tracking-wide text-heading truncate">
          {name}
        </span>
        {batting && (
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="font-display font-black text-[42px] sm:text-[50px] leading-none tabular-nums text-heading">
          {score}
          <span className="text-subheading font-extrabold">/{wkts}</span>
        </span>
        <span className="block text-[12px] font-bold text-subheading tabular-nums mt-1">
          {overs} overs
        </span>
      </div>
    </div>
  );

  return (
    <div className="surface-card overflow-hidden relative live-glow">
      <div
        className="h-1.5"
        aria-hidden="true"
        style={{
          backgroundImage: `linear-gradient(90deg, ${teamColorHex("Morang Kings")} 0%, ${teamColorHex("Morang Kings")} 42%, ${teamColorHex("Jhapa Rhinos")} 58%, ${teamColorHex("Jhapa Rhinos")} 100%)`,
        }}
      />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              Koshi Premier League
            </p>
            <p className="text-subheading text-[13px] mt-1 flex items-center gap-1">
              <MapPin size={13} /> Urlabari Ground
            </p>
          </div>
          <span className="count-pill uppercase tracking-[0.16em] shrink-0">
            Preview
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {row("Morang Kings", 186, 6, "20.0/20", false)}
          {row("Jhapa Rhinos", 148, 4, "16.2/20", true)}
        </div>

        <div className="mt-3.5 px-1">
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: "82%" }} />
          </div>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary tabular-nums">
            Over 16.2 of 20 · 82% bowled
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t card-border pt-3 text-[13px] font-semibold text-subheading tabular-nums">
          <span className="font-bold text-emerald-700 dark:text-lime-300">
            Need 39 off 22 balls
          </span>
          <span>
            CRR <span className="text-heading font-space">9.06</span>
          </span>
          <span>
            RRR <span className="text-heading font-space">10.64</span>
          </span>
        </div>

        <div className="flex items-center flex-wrap mt-3 border-t card-border pt-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary mr-1.5">
            This over
          </span>
          {thisOver.map((s, i) => (
            <TimelineItem key={i} result={s} />
          ))}
        </div>

        <div className="mt-4 border-t card-border pt-3.5">
          <WinMeter teamA="Morang Kings" teamB="Jhapa Rhinos" teamAPct={29} />
        </div>
      </div>
    </div>
  );
};

export default FeaturedMatch;
