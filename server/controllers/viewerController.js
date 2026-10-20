const Match = require("../models/Match");
const Tournament = require("../models/Tournment");
const Innings = require("../models/Innings");
const scoring = require("../services/scoringService");
const { computeInningsState } = require("../engine/scoringEngine");

async function handleGetAllTournaments(req, res) {
  try {
    const tours = await Tournament.find();
    if (tours.length === 0) {
      return res.status(200).json({ message: "No Tournaments", data: [] });
    }
    return res
      .status(200)
      .json({ message: "Tournaments fetched successfully", data: tours });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Something went wrong while fetching tournaments" });
  }
}

async function handleGetTournamentInfo(req, res) {
  const tourId = req.params.id;
  try {
    const fixtures = await Match.find({ tournament_id: tourId });
    if (fixtures.length === 0) {
      return res.status(200).json({ message: "No fixtures found", data: [] });
    }
    return res.status(200).json({ message: "Fixtures found", data: fixtures });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}

/** Milestones reached during an innings, derived from its ball log. */
function computeMilestones(events, names) {
  const milestones = [];
  let teamRuns = 0;
  let nextTeamMark = 50;
  const batterRuns = new Map();
  let pairRuns = 0;
  let pairKey = "";
  for (const ev of events) {
    const total =
      (ev.batRuns || 0) +
      (ev.extras?.wide || 0) +
      (ev.extras?.noBall || 0) +
      (ev.extras?.bye || 0) +
      (ev.extras?.legBye || 0) +
      (ev.extras?.penalty || 0);
    teamRuns += total;
    const strikerId = String(ev.striker);
    const before = batterRuns.get(strikerId) || 0;
    const after = before + (ev.batRuns || 0);
    batterRuns.set(strikerId, after);
    for (const mark of [50, 100, 150, 200]) {
      if (before < mark && after >= mark) {
        milestones.push({
          type: "batsman",
          label: `${names[strikerId] || "Batsman"} reaches ${mark}`,
          runs: teamRuns,
        });
      }
    }
    while (teamRuns >= nextTeamMark) {
      milestones.push({ type: "team", label: `Team ${nextTeamMark} up`, runs: teamRuns });
      nextTeamMark += 50;
    }
    const key = [String(ev.striker), String(ev.nonStriker)].sort().join("|");
    if (key !== pairKey) {
      pairKey = key;
      pairRuns = 0;
    }
    const pairBefore = pairRuns;
    pairRuns += total;
    for (const mark of [50, 100, 150, 200]) {
      if (pairBefore < mark && pairRuns >= mark) {
        milestones.push({ type: "partnership", label: `${mark} partnership`, runs: teamRuns });
      }
    }
    if (ev.wicket && ev.wicket.type && ev.wicket.type !== "retired_hurt") {
      pairRuns = 0;
      pairKey = "";
    }
  }
  return milestones;
}

/** Public match list for the viewer app. ?state=live|upcoming|completed */
async function handleGetMatches(req, res) {
  try {
    const filter = {};
    if (req.query.state) filter.matchState = req.query.state;
    if (req.query.tournament) filter.tournament_id = req.query.tournament;
    const matches = await Match.find(filter)
      .populate("innings")
      .sort({ match_date: -1 })
      .limit(100);
    return res.status(200).json({ message: "Matches fetched", data: matches });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}

/** Public match detail: match + innings snapshots + ball log + derived state. */
async function handleGetMatchDetail(req, res) {
  try {
    const match = await Match.findById(req.params.id).populate(
      "tournament_id",
      "format name"
    );
    if (!match) return res.status(404).json({ message: "Match not found" });
    const innings = await Innings.find({ matchId: match._id }).sort({
      inningNumber: 1,
    });
    const names = await scoring.buildPlayerNames(match);
    const totalOvers = match.tournament_id?.format || 20;

    const detail = [];
    for (const inning of innings) {
      const events = await scoring.loadEvents(inning._id);
      let state = null;
      try {
        state = computeInningsState(scoring.toEngineEvents(events), {
          totalOvers,
          target: inning.target || null,
          playerNames: names,
        });
      } catch {
        state = null; // legacy/corrupt log: fall back to the stored snapshot
      }
      detail.push({ inning, state, events, milestones: computeMilestones(events, names) });
    }
    return res
      .status(200)
      .json({ message: "Match fetched", data: { match, innings: detail } });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}

/**
 * Points table with net run rate.
 * Win = 2 pts, tie / no result = 1 pt each.
 * NRR uses the standard all-out rule: a team bowled out is debited its
 * full over allocation.
 */
async function handleGetPointsTable(req, res) {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    const totalOvers = tournament.format || 20;
    const matches = await Match.find({ tournament_id: tournament._id });
    const teamIds = new Set();
    matches.forEach((m) => {
      teamIds.add(String(m.teamA_id));
      teamIds.add(String(m.teamB_id));
    });

    const table = {};
    const blank = (id, name) => ({
      teamId: id,
      team: name,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      ballsFaced: 0,
      runsAgainst: 0,
      ballsBowled: 0,
      nrr: 0,
    });
    matches.forEach((m) => {
      table[String(m.teamA_id)] ??= blank(String(m.teamA_id), m.teamA);
      table[String(m.teamB_id)] ??= blank(String(m.teamB_id), m.teamB);
    });

    for (const match of matches) {
      if (match.matchState !== "completed") continue;
      const a = table[String(match.teamA_id)];
      const b = table[String(match.teamB_id)];
      a.played += 1;
      b.played += 1;
      if (!match.winner) {
        a.tied += 1;
        b.tied += 1;
        a.points += 1;
        b.points += 1;
      } else if (String(match.winner) === String(match.teamA_id)) {
        a.won += 1;
        b.lost += 1;
        a.points += 2;
      } else {
        b.won += 1;
        a.lost += 1;
        b.points += 2;
      }

      const innings = await Innings.find({ matchId: match._id });
      for (const inn of innings) {
        const bat = table[String(inn.batting_team)];
        const bowl = table[String(inn.fielding_team)];
        if (!bat || !bowl) continue;
        const balls = inn.wickets >= 10 ? totalOvers * 6 : inn.legal_balls ?? inn.over * 6 + inn.balls;
        bat.runsFor += inn.runs;
        bat.ballsFaced += balls;
        bowl.runsAgainst += inn.runs;
        bowl.ballsBowled += balls;
      }
    }

    const formByTeam = {};
    const completed = matches
      .filter((m) => m.matchState === "completed")
      .sort((x, y) => new Date(x.match_date) - new Date(y.match_date));
    for (const match of completed) {
      const push = (id, r) => {
        formByTeam[id] ??= [];
        formByTeam[id].push(r);
        if (formByTeam[id].length > 5) formByTeam[id].shift();
      };
      if (!match.winner) {
        push(String(match.teamA_id), "T");
        push(String(match.teamB_id), "T");
      } else if (String(match.winner) === String(match.teamA_id)) {
        push(String(match.teamA_id), "W");
        push(String(match.teamB_id), "L");
      } else {
        push(String(match.teamB_id), "W");
        push(String(match.teamA_id), "L");
      }
    }

    const rows = Object.values(table).map((r) => {
      const forRate = r.ballsFaced > 0 ? r.runsFor / (r.ballsFaced / 6) : 0;
      const againstRate = r.ballsBowled > 0 ? r.runsAgainst / (r.ballsBowled / 6) : 0;
      return {
        ...r,
        nrr: Math.round((forRate - againstRate) * 1000) / 1000,
        form: formByTeam[r.teamId] || [],
      };
    });
    rows.sort((x, y) => y.points - x.points || y.nrr - x.nrr);

    return res.status(200).json({ message: "Points table", data: rows });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}

/**
 * Tournament leaderboards, aggregated from innings snapshots:
 * most runs, most wickets, fifties/hundreds, best bowling figures.
 */
async function handleGetTournamentStats(req, res) {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    const matches = await Match.find({ tournament_id: tournament._id }).select("_id");
    const innings = await Innings.find({ matchId: { $in: matches.map((m) => m._id) } });

    const teamName = async (id) => {
      const m = await Match.findOne({
        tournament_id: tournament._id,
        $or: [{ teamA_id: id }, { teamB_id: id }],
      }).select("teamA teamB teamA_id teamB_id");
      if (!m) return "";
      return String(m.teamA_id) === String(id) ? m.teamA : m.teamB;
    };
    const teamCache = new Map();
    const teamOf = async (id) => {
      const k = String(id);
      if (!teamCache.has(k)) teamCache.set(k, await teamName(id));
      return teamCache.get(k);
    };

    const bat = new Map();
    const bowl = new Map();
    for (const inn of innings) {
      const battingTeam = await teamOf(inn.batting_team);
      const fieldingTeam = await teamOf(inn.fielding_team);
      for (const b of inn.batsmen || []) {
        const key = String(b.batsmanId);
        const row = bat.get(key) || {
          playerId: key, name: b.name, team: battingTeam,
          innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
          fifties: 0, hundreds: 0, highest: 0, outs: 0,
        };
        row.innings += 1;
        row.runs += b.runs;
        row.balls += b.balls;
        row.fours += b.fours;
        row.sixes += b.sixes;
        if (b.runs >= 100) row.hundreds += 1;
        else if (b.runs >= 50) row.fifties += 1;
        row.highest = Math.max(row.highest, b.runs);
        if (b.status === "out") row.outs += 1;
        bat.set(key, row);
      }
      for (const bw of inn.bowlers || []) {
        const key = String(bw.bowlerId);
        const row = bowl.get(key) || {
          playerId: key, name: bw.name, team: fieldingTeam,
          innings: 0, wickets: 0, balls: 0, runsConceded: 0, maidens: 0,
          bestWickets: 0, bestRuns: Infinity,
        };
        row.innings += 1;
        row.wickets += bw.wickets;
        row.balls += bw.balls;
        row.runsConceded += bw.runs_conceded;
        row.maidens += bw.maidens;
        if (bw.wickets > row.bestWickets || (bw.wickets === row.bestWickets && bw.runs_conceded < row.bestRuns)) {
          row.bestWickets = bw.wickets;
          row.bestRuns = bw.runs_conceded;
        }
        bowl.set(key, row);
      }
    }

    const r2 = (n) => Math.round(n * 100) / 100;
    const batting = [...bat.values()].map((r) => ({
      ...r,
      average: r.outs > 0 ? r2(r.runs / r.outs) : r.runs,
      strikeRate: r.balls > 0 ? r2((r.runs / r.balls) * 100) : 0,
    }));
    batting.sort((a, b) => b.runs - a.runs);
    const bowling = [...bowl.values()].map((r) => ({
      ...r,
      best: `${r.bestWickets}/${r.bestRuns === Infinity ? 0 : r.bestRuns}`,
      economy: r.balls > 0 ? r2(r.runsConceded / (r.balls / 6)) : 0,
      average: r.wickets > 0 ? r2(r.runsConceded / r.wickets) : null,
    }));
    bowling.sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded);

    return res.status(200).json({
      message: "Tournament stats",
      data: { batting: batting.slice(0, 20), bowling: bowling.slice(0, 20) },
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
}

module.exports = {
  handleGetAllTournaments,
  handleGetTournamentInfo,
  handleGetMatches,
  handleGetMatchDetail,
  handleGetPointsTable,
  handleGetTournamentStats,
};
