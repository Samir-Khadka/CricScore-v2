const mongoose = require("mongoose");
const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    tournament_name: {
      type: String,
      required: true,
    },

    tournament_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tournaments",
      required: true,
    },

    teamA: {
      type: String,
      required: true,
    },

    teamB: {
      type: String,
      required: true,
    },
    teamA_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teams",
      required: true,
    },
    teamB_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teams",
      required: true,
    },
    match_date: {
      type: Date,
      required: true,
    },
    match_time: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },

    toss: {
      wonBy: String,
      decision: String,
    },
    matchState: {
      type: String,
      default: "upcoming",
      required: true,
    },
    umpires: {
      onField: [String],
      third: String,
      tv: String,
    },
    matchRefree: {
      type: String,
    },

    result: {
      type: String,
    },

    winner: {
      type: Schema.Types.ObjectId,
      ref: "teams",
    },

    points: {
      type: String,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "scorers",
      required: true,
    },

    playingXI: {
      type: [
        {
          teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "teams",
            required: true,
          },
          teamName: {
            type: String,
            required: true,
          },
          players: [
            {
              name: {
                type: String,
                required: true,
              },
              isCaptain: {
                type: Boolean,
                default: false,
              },
            },
          ],
        },
      ],
      default: [],
    },
    innings: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "innings",
      default: [],
    },
    inning_in_progress: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Match", MatchSchema);
