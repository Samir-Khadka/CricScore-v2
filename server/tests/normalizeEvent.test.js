/**
 * Pins the behaviour of scoringService.normalizeEvent — the boundary
 * that translates legacy CRA scorer payloads (snake_case, "nb+2b"
 * merged extras, run_out_* variants) into the engine's event shape.
 * This layer is spec-critical: a mistranslation silently corrupts
 * every scorecard derived from the ball log.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEvent } = require("../services/scoringService");

const ZERO = { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0 };

test("modern shape passes through with camelCase extras", () => {
  const ev = normalizeEvent({
    striker: "p1",
    nonStriker: "p2",
    bowler: "b1",
    batRuns: 3,
    extras: { wide: 0, noBall: 1, bye: 0, legBye: 2, penalty: 0 },
    wicket: null,
  });
  assert.equal(ev.striker, "p1");
  assert.equal(ev.nonStriker, "p2");
  assert.equal(ev.bowler, "b1");
  assert.equal(ev.batRuns, 3);
  assert.deepEqual(ev.extras, { wide: 0, noBall: 1, bye: 0, legBye: 2, penalty: 0 });
  assert.equal(ev.wicket, null);
});

test("modern shape defaults missing extras and batRuns to zero", () => {
  const ev = normalizeEvent({ striker: "p1", nonStriker: "p2", bowler: "b1" });
  assert.equal(ev.batRuns, 0);
  assert.deepEqual(ev.extras, ZERO);
});

test("legacy plain ball: snake_case fields are translated", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 2,
    extras: {},
  });
  assert.equal(ev.nonStriker, "p2");
  assert.equal(ev.batRuns, 2);
  assert.deepEqual(ev.extras, ZERO);
  assert.equal(ev.wicket, null);
});

test("legacy extras: no_ball / leg_bye snake_case keys map over", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: { no_ball: 1, leg_bye: 2, wide: 1 },
    event: "nb",
  });
  assert.equal(ev.extras.noBall, 1);
  assert.equal(ev.extras.legBye, 2);
  assert.equal(ev.extras.wide, 1);
});

test('legacy "nb+2b": byes folded into the no-ball count are split back out', () => {
  // Legacy buttons recorded a no-ball + 2 byes as no_ball: 3. The real
  // no-ball penalty is 1; the remaining 2 are byes.
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: { no_ball: 3 },
    event: "nb+2b",
  });
  assert.equal(ev.extras.noBall, 1);
  assert.equal(ev.extras.bye, 2);
});

test('legacy "nb+3lb" currently folds into byes (pinned quirk)', () => {
  // The /b$/ branch is tested before /lb$/, and every "…lb" string
  // also ends in "b" — so the leg-bye branch is unreachable today and
  // merged leg-byes land in `bye`. Pinned so a future fix is a
  // deliberate behaviour change, not an accident.
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: { no_ball: 4 },
    event: "nb+3lb",
  });
  assert.equal(ev.extras.noBall, 1);
  assert.equal(ev.extras.bye, 3);
  assert.equal(ev.extras.legBye, 0);
});

test("legacy run_out_striker: striker is the player out", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 1,
    extras: {},
    is_out: true,
    how_out: "run_out_striker",
    batsman_out: "p9",
  });
  assert.equal(ev.wicket.type, "run_out");
  assert.equal(ev.wicket.playerOut, "p1");
});

test("legacy run_out_non_striker: non-striker is the player out", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: {},
    is_out: true,
    how_out: "run_out_non_striker",
  });
  assert.equal(ev.wicket.type, "run_out");
  assert.equal(ev.wicket.playerOut, "p2");
});

test("legacy wicket without how_out defaults to bowled, batsman_out wins", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: {},
    is_out: true,
    batsman_out: "p1",
  });
  assert.equal(ev.wicket.type, "bowled");
  assert.equal(ev.wicket.playerOut, "p1");
});

test("legacy fielders given as objects are flattened to ids", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 0,
    extras: {},
    is_out: true,
    how_out: "caught",
    fielders: [{ _id: "f1" }, { id: "f2" }, "f3"],
  });
  assert.deepEqual(ev.wicket.fielders, ["f1", "f2", "f3"]);
});

test("legacy ball with no dismissal carries no wicket", () => {
  const ev = normalizeEvent({
    striker: "p1",
    non_striker: "p2",
    bowler: "b1",
    bat_run: 4,
    extras: {},
    is_out: false,
  });
  assert.equal(ev.wicket, null);
  assert.equal(ev.batRuns, 4);
});
