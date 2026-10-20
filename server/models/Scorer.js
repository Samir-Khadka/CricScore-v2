const { Schema, model } = require("mongoose");

const scorerSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone:{
      type: String,
    },
    country:{
      type: String,
    },
    postalCode:{
      type: String,
    },
      image: {
    data: Buffer,
    contentType: String,
  },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Scorer = model("scorers", scorerSchema);

module.exports = Scorer;
