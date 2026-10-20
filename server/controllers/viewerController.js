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
      detail.push({ inning, state, events });
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

    const rows = Object.values(table).map((r) => {
      const forRate = r.ballsFaced > 0 ? r.runsFor / (r.ballsFaced / 6) : 0;
      const againstRate = r.ballsBowled > 0 ? r.runsAgainst / (r.ballsBowled / 6) : 0;
      return { ...r, nrr: Math.round((forRate - againstRate) * 1000) / 1000 };
    });
    rows.sort((x, y) => y.points - x.points || y.nrr - x.nrr);

    return res.status(200).json({ message: "Points table", data: rows });
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
};
