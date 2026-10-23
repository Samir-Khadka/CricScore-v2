const express = require("express");
const Scorer = require("../models/Scorer");
const config = require("../config");
const { createJwtToken } = require("../services/token");
const multer = require("multer");
const bcrypt = require("bcrypt");
const upload = multer({ storage: multer.memoryStorage() });

async function handleScorerSignup(req, res) {
  try {
    const { fullName, email, password } = req.body;
    const isScorer = await Scorer.findOne({email});

    if (isScorer) {
      throw new Error("Scorer already exists");
    }

    //hashing password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    await Scorer.create({ fullName, email, password: hashedPass });
    return res.status(201).json({ message: "Scorer created successfully" });
  } catch (exception) {
    return res.status(422).json({ message: "Exception Occured: " + exception });
  }
}

async function handleScorerLogin(req, res) {
  try {
    const { email, password } = req.body;
    const scorer = await Scorer.findOne({ email });

    if (!scorer) throw new Error("Scorer doesn't exists");

    //compare password
    const matchPass = await bcrypt.compare(password, scorer.password);
    if (!matchPass) throw new Error("Password doesn't match");

    //if match then create token
    const token = createJwtToken(scorer);

    const user = {
      id: scorer._id,
      fullName: scorer.fullName,
      email: scorer.email,
      phone: scorer.phone || "NA",
      country: scorer.country || "NA",
      postalCode: scorer.postalCode || "NA",
    };

    return res
      .cookie("token", token, {
        httpOnly: true,
        // The web app and API are served from different domains in
        // production, so the session cookie must be SameSite=None there
        // (with Secure) or browsers won't send it on API calls.
        sameSite: config.isProd ? "none" : "lax",
        secure: config.isProd,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({ message: "Login details matched", user });
  } catch (exception) {
    return res.status(401).json({ message: "Failed to login. " + exception });
  }
}

async function updateScorer(req,res){
 const { fullName, phone, country, postalCode } = req.body;
      try{
    // The record to update comes from the session token, never from a
    // client-supplied email — otherwise anyone could edit any profile.
    const scorer = await Scorer.findById(req.scorer._id);

    if (!scorer) throw new Error("Scorer doesn't exists");
     // Update fields if provided
    if (fullName) scorer.fullName = fullName;
    if (phone) scorer.phone = phone;
    if (country) scorer.country = country;
    if (postalCode) scorer.postalCode = postalCode;

    // Save updates
    await scorer.save();

    return res.status(200).json({
      message: "Scorer updated successfully",
      scorer: {
        id: scorer._id,
        fullName: scorer.fullName,
        email: scorer.email,
        phone: scorer.phone,
        country: scorer.country,
        postalCode: scorer.postalCode,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Error updating scorer", error: error.message });


}
}

async function uploadImage(req, res) {
  try {
    const { email } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    // Scorers can only replace their own profile image.
    if (String(email) !== String(req.scorer.email)) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    const scorer = await Scorer.findOne({ email });
    if (!scorer) {
      return res.status(404).json({ message: "Scorer not found" });
    }

    scorer.image = {
      data: req.file.buffer,
      contentType: req.file.mimetype,
    };

    await scorer.save();

    res.status(200).json({ message: "Image uploaded successfully" });
  } catch (error) {
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
}


async function getScorerImage(req,res){
try {
    const { email } = req.params;
    const scorer = await Scorer.findOne({ email });

    if (!scorer || !scorer.image || !scorer.image.data) {
      return res.status(404).send("No image found");
    }

    res.set("Content-Type", scorer.image.contentType);
    res.send(scorer.image.data);
  } catch (error) {
    res.status(500).json({ message: "Error fetching image", error: error.message });
  }
}

module.exports = {
  handleScorerSignup,
  handleScorerLogin,
  updateScorer,
  uploadImage,
  getScorerImage,
};
