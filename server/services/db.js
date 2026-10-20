const mongoose = require("mongoose");
const config = require("../config");

const connectToMongoose = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
};

module.exports = connectToMongoose;
