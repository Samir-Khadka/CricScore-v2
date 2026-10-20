const mongoose = require("mongoose");
const { Schema, model } = mongoose;

/**
 * One delivery, stored in the engine's native shape. The ball-by-ball log
 * is the single source of truth: every scorecard figure is derived from
 * these documents by the scoring engine (see engine/scoringEngine.js).
 */
const BallEventsSchema = new Schema(
  {
    inning: {
      type: Schema.Types.ObjectId,
      ref: "innings",
      required: true,
      index: true,
    },
    sequence: {
      type: Number,
      required: true,
    },
    striker: { type: Schema.Types.ObjectId, ref: "players", required: true },
    nonStriker: { type: Schema.Types.ObjectId, ref: "players", required: true },
    bowler: { type: Schema.Types.ObjectId, ref: "players", required: true },
    batRuns: { type: Number, default: 0 },
    extras: {
      wide: { type: Number, default: 0 },
      noBall: { type: Number, default: 0 },
      bye: { type: Number, default: 0 },
      legBye: { type: Number, default: 0 },
      penalty: { type: Number, default: 0 },
    },
    wicket: {
      type: {
        type: String,
        enum: [
          "bowled",
          "caught",
          "caught_and_bowled",
          "lbw",
          "stumped",
          "hit_wicket",
          "run_out",
          "retired_hurt",
          "retired_out",
          "obstructing",
          "hit_ball_twice",
          "timed_out",
        ],
        default: null,
      },
      playerOut: { type: Schema.Types.ObjectId, ref: "players", default: null },
      fielders: [{ type: Schema.Types.ObjectId, ref: "players" }],
    },
    // Display snapshots (names at the time of the ball, for commentary).
    names: {
      striker: String,
      nonStriker: String,
      bowler: String,
      playerOut: String,
    },
    commentary: { type: String, default: "" },
    // Client-generated id per scoring tap: retries/double-taps with the
    // same id are applied once (idempotency).
    clientEventId: { type: String, default: null },
    voided: { type: Boolean, default: false }, // undone balls stay for audit
  },
  { timestamps: true }
);

BallEventsSchema.index({ inning: 1, sequence: 1 });
BallEventsSchema.index(
  { inning: 1, clientEventId: 1 },
  { unique: true, partialFilterExpression: { clientEventId: { $type: "string" }, voided: false } }
);

const BallEvents = model("ballEvents", BallEventsSchema);
module.exports = BallEvents;
