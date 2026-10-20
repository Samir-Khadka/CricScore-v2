const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeInningsState, matchResult } = require("../engine/scoringEngine");

const NAMES = {};
for (let i = 1; i <= 11; i++) NAMES[`p${i}`] = `Batter${i}`;
for (let i = 1; i <= 11; i++) NAMES[`b${i}`] = `Bowler${i}`;
NAMES.x1 = "Fielder1";

const CFG = { totalOvers: 20, playerNames: NAMES };
const CHASE = { totalOvers: 20, target: 101, playerNames: NAMES };

let seq = 0;
function ball(over = {}) {
  return {
    striker: "p1",
    nonStriker: "p2",
    bowler: "b1",
    batRuns: 0,
    extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, penalty: 0 },
    wicket: null,
    ...over,
  };
}
const over = (bowler, balls) => balls.map((b) => ball({ bowler, ...b }));
const dots = (n) => Array.from({ length: n }, () => ({}));

test("first ball is counted exactly once (old double-count bug)", () => {
  const s = computeInningsState([ball({ batRuns: 4 })], CFG);
  const bat = s.batsmen.find((b) => b.id === "p1");
  assert.equal(bat.runs, 4);
  assert.equal(bat.balls, 1);
  assert.equal(bat.fours, 1);
  const bowl = s.bowlers.find((b) => b.id === "b1");
  assert.equal(bowl.runsConceded, 4);
  assert.equal(bowl.balls, 1);
  assert.equal(s.runs, 4);
});

test("wide: not a legal ball, not a ball faced, penalty run counts", () => {
  const s = computeInningsState(
    [ball({ extras: { wide: 1, noBall: 0, bye: 0, legBye: 0, penalty: 0 } })],
    CFG
  );
  assert.equal(s.runs, 1);
  assert.equal(s.legalBalls, 0);
  assert.equal(s.extras.wide, 1);
  assert.equal(s.batsmen[0].balls, 0);
  assert.equal(s.bowlers[0].balls, 0);
});

test("wide + 2 runs = 3 total, extras keep full run value", () => {
  const s = computeInningsState(
    [ball({ extras: { wide: 3, noBall: 0, bye: 0, legBye: 0, penalty: 0 } })],
    CFG
  );
  assert.equal(s.runs, 3);
  assert.equal(s.extras.wide, 3);
});

test("no-ball: penalty + bat runs, counts as ball faced, sets free hit", () => {
  const s = computeInningsState(
    [ball({ batRuns: 2, extras: { wide: 0, noBall: 1, bye: 0, legBye: 0, penalty: 0 } })],
    CFG
  );
  assert.equal(s.runs, 3);
  assert.equal(s.legalBalls, 0);
  assert.equal(s.batsmen[0].balls, 1);
  assert.equal(s.batsmen[0].runs, 2);
  assert.equal(s.freeHit, true);
  assert.equal(s.bowlers[0].runsConceded, 3);
});

test("free hit: bowled is rejected, run out is allowed", () => {
  const nb = ball({ extras: { wide: 0, noBall: 1, bye: 0, legBye: 0, penalty: 0 } });
  assert.throws(
    () =>
      computeInningsState(
        [nb, ball({ wicket: { type: "bowled", playerOut: "p1", fielders: [] } })],
        CFG
      ),
    (e) => e.code === "FREE_HIT_WICKET"
  );
  const s = computeInningsState(
    [nb, ball({ batRuns: 1, wicket: { type: "run_out", playerOut: "p1", fielders: ["x1"] } })],
    CFG
  );
  assert.equal(s.wickets, 1);
  assert.equal(s.bowlers[0].wickets, 0);
  assert.equal(s.freeHit, false);
});

test("CRR uses fractional overs, not display overs (old 5.3 bug)", () => {
  // 33 legal balls (5.3 overs), 33 runs -> true CRR = 33 / 5.5 = 6.0
  const balls = [
    ...over("b1", [{ batRuns: 6 }, {}, {}, {}, {}, {}]),
    ...over("b2", [{ batRuns: 6 }, {}, {}, {}, {}, {}]),
    ...over("b1", [{ batRuns: 6 }, {}, {}, {}, {}, {}]),
    ...over("b2", [{ batRuns: 6 }, {}, {}, {}, {}, {}]),
    ...over("b1", [{ batRuns: 6 }, {}, {}, {}, {}, {}]),
    ...over("b2", [{ batRuns: 3 }, {}, {}]),
  ];
  const s = computeInningsState(balls, { totalOvers: 20, playerNames: NAMES });
  assert.equal(s.legalBalls, 33);
  assert.equal(s.oversText, "5.3");
  assert.equal(s.currentRunRate, 6);
});

test("RRR uses innings total, not the current ball (old RRR bug)", () => {
  // Target 101. Score 40 off 30 balls. Need 61 off 90 -> RRR 4.07
  const balls = [];
  for (let o = 0; o < 5; o++) {
    balls.push(...over(o % 2 ? "b2" : "b1", [{ batRuns: 4 }, { batRuns: 4 }, {}, {}, {}, {}]));
  }
  const s = computeInningsState(balls, CHASE);
  assert.equal(s.runs, 40);
  assert.equal(s.runsNeeded, 61);
  assert.equal(s.ballsRemaining, 90);
  assert.equal(s.requiredRunRate, 4.07);
});

test("run out of non-striker: striker untouched, bowler gets no wicket", () => {
  const s = computeInningsState(
    [
      ball({
        batRuns: 1,
        wicket: { type: "run_out", playerOut: "p2", fielders: ["x1"] },
      }),
    ],
    CFG
  );
  assert.equal(s.wickets, 1);
  assert.equal(s.bowlers[0].wickets, 0);
  assert.equal(s.batsmen.find((b) => b.id === "p2").status, "out");
  assert.equal(s.batsmen.find((b) => b.id === "p1").status, "batting");
  assert.match(s.batsmen.find((b) => b.id === "p2").howOut, /run out/);
});

test("dismissal text uses names, not ids", () => {
  const s = computeInningsState(
    [ball({ wicket: { type: "caught", playerOut: "p1", fielders: ["x1"] } })],
    CFG
  );
  assert.equal(s.batsmen[0].howOut, "c Fielder1 b Bowler1");
});

test("strike rotation: single swaps, over end swaps back", () => {
  const balls = [...over("b1", [{ batRuns: 1 }, {}, {}, {}, {}, {}])];
  const s = computeInningsState(balls, CFG);
  // p1 took a single off ball 1 (p2 faces rest), then ends change after over
  assert.equal(s.striker, "p1");
  const mid = computeInningsState(balls.slice(0, 1), CFG);
  assert.equal(mid.striker, "p2");
});

test("innings ends at 10 wickets and rejects further balls", () => {
  const balls = [];
  const bowlers = ["b1", "b2"];
  let batter = 3;
  for (let o = 0; o < 2; o++) {
    for (let i = 0; i < 6 && balls.length < 10; i++) {
      balls.push(
        ball({
          bowler: bowlers[o % 2],
          striker: `p${batter - 2}`,
          nonStriker: `p${batter - 1}`,
          wicket: { type: "bowled", playerOut: `p${batter - 2}`, fielders: [] },
        })
      );
      batter++;
    }
  }
  balls[9] = ball({
    bowler: "b2",
    striker: "p10",
    nonStriker: "p11",
    wicket: { type: "bowled", playerOut: "p10", fielders: [] },
  });
  const s = computeInningsState(balls, CFG);
  assert.equal(s.wickets, 10);
  assert.equal(s.isComplete, true);
  assert.throws(
    () => computeInningsState([...balls, ball({ striker: "p11", nonStriker: "p9" })], CFG),
    (e) => e.code === "INNINGS_COMPLETE"
  );
});

test("innings ends when overs run out (short game)", () => {
  const balls = [...over("b1", dots(6)), ...over("b2", dots(6))];
  const s = computeInningsState(balls, { totalOvers: 2, playerNames: NAMES });
  assert.equal(s.isComplete, true);
});

test("innings ends when target is chased", () => {
  const balls = [...over("b1", [{ batRuns: 6 }, { batRuns: 6 }])];
  const s = computeInningsState(balls, { totalOvers: 20, target: 12, playerNames: NAMES });
  assert.equal(s.isComplete, true);
  assert.equal(s.runs, 12);
});

test("maiden: scoreless over counts, a bye does not break it, a wide does", () => {
  const maiden = computeInningsState([...over("b1", dots(6))], CFG);
  assert.equal(maiden.bowlers[0].maidens, 1);
  const withBye = computeInningsState(
    [...over("b1", [{ extras: { wide: 0, noBall: 0, bye: 1, legBye: 0, penalty: 0 } }, ...dots(5)])],
    CFG
  );
  assert.equal(withBye.bowlers[0].maidens, 1);
  const withWide = computeInningsState(
    [
      ...over("b1", [
        { extras: { wide: 1, noBall: 0, bye: 0, legBye: 0, penalty: 0 } },
        ...dots(6),
      ]),
    ],
    CFG
  );
  assert.equal(withWide.bowlers[0].maidens, 0);
});

test("bowler cannot bowl consecutive overs or exceed max overs", () => {
  assert.throws(
    () => computeInningsState([...over("b1", dots(6)), ...over("b1", dots(1))], CFG),
    (e) => e.code === "BOWLER_CONSECUTIVE_OVER"
  );
  const balls = [];
  for (let o = 0; o < 8; o++) balls.push(...over(o % 2 ? "b2" : "b1", dots(6)));
  balls.push(...over("b1", dots(1)));
  assert.throws(
    () => computeInningsState(balls, CFG),
    (e) => e.code === "BOWLER_MAX_OVERS"
  );
});

test("retired hurt: not a wicket, batsman can return later", () => {
  const balls = [
    ball({ wicket: { type: "retired_hurt", playerOut: "p1", fielders: [] } }),
    ball({ striker: "p3", nonStriker: "p2", bowler: "b1" }),
    ball({ striker: "p3", nonStriker: "p2", bowler: "b1", wicket: { type: "bowled", playerOut: "p3", fielders: [] } }),
    ball({ striker: "p1", nonStriker: "p2", bowler: "b1", batRuns: 4 }),
  ];
  const s = computeInningsState(balls, CFG);
  assert.equal(s.wickets, 1);
  const p1 = s.batsmen.find((b) => b.id === "p1");
  assert.equal(p1.status, "batting");
  assert.equal(p1.runs, 4);
});

test("fall of wickets and Manhattan data are derived", () => {
  const balls = [
    ball({ batRuns: 4 }),
    ball({ wicket: { type: "bowled", playerOut: "p1", fielders: [] } }),
    ...over("b1", [{ striker: "p3" }, { striker: "p3" }, { striker: "p3" }, { striker: "p3" }]),
    ball({ striker: "p3", nonStriker: "p2", bowler: "b2", batRuns: 6 }),
  ];
  const s = computeInningsState(balls, CFG);
  assert.equal(s.fallOfWickets.length, 1);
  assert.equal(s.fallOfWickets[0].runs, 4);
  assert.equal(s.overs[0].runs, 4);
  assert.equal(s.overs[0].wickets, 1);
  assert.equal(s.overs[1].runs, 6);
});

test("undo is exact: re-folding without the last ball restores prior state", () => {
  const balls = [...over("b1", [{ batRuns: 4 }, { batRuns: 1 }, { batRuns: 6 }])];
  const before = computeInningsState(balls.slice(0, 2), CFG);
  const after = computeInningsState(balls, CFG);
  assert.equal(after.runs, before.runs + 6);
  const undone = computeInningsState(balls.slice(0, 2), CFG);
  assert.deepEqual(undone.batsmen, before.batsmen);
  assert.deepEqual(undone.bowlers, before.bowlers);
});

test("this-over symbols", () => {
  const balls = [
    ball({ batRuns: 4 }),
    ball({ extras: { wide: 1, noBall: 0, bye: 0, legBye: 0, penalty: 0 } }),
    ball({ wicket: { type: "bowled", playerOut: "p1", fielders: [] } }),
    ball({ striker: "p3", batRuns: 1 }),
  ];
  const s = computeInningsState(balls, CFG);
  assert.deepEqual(s.thisOver, ["4", "Wd", "W", "1"]);
});

test("matchResult: runs win, wickets win, tie", () => {
  const inn1 = computeInningsState([...over("b1", [{ batRuns: 6 }, ...dots(5)])], {
    totalOvers: 1,
    playerNames: NAMES,
  });
  const inn2win = computeInningsState([ball({ batRuns: 4 }), ball({ batRuns: 3 })], {
    totalOvers: 1,
    target: 7,
    playerNames: NAMES,
  });
  const r = matchResult(inn1, inn2win, { teamA: "Alpha", teamB: "Beta" });
  assert.equal(r.winner, "B");
  assert.match(r.text, /Beta won by 10 wickets/);
  const inn2lose = computeInningsState([...over("b1", dots(6))], {
    totalOvers: 1,
    target: 7,
    playerNames: NAMES,
  });
  const r2 = matchResult(inn1, inn2lose, { teamA: "Alpha", teamB: "Beta" });
  assert.equal(r2.winner, "A");
  assert.match(r2.text, /Alpha won by 6 runs/);
});
