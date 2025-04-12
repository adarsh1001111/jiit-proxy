const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");
const { isNotAuthenticated, isAuthenticated } = require("../middlewares/auth");
const { sendVerificationEmail } = require("../utils/email");
const crypto = require("crypto");

// Register
router.get("/register", isNotAuthenticated, (req, res) => {
  res.render("auth/register");
});

router.post("/register", isNotAuthenticated, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      enrollmentNumber,
      jiitPortalUsername,
      jiitPortalPassword,
    } = req.body;

    // Validation
    if (password !== confirmPassword) {
      return res.render("auth/register", {
        error: "Passwords do not match",
        name,
        email,
        enrollmentNumber,
        jiitPortalUsername,
      });
    }

    if (!email.endsWith("@jiit.ac.in")) {
      return res.render("auth/register", {
        error: "Please use your JIIT email address",
        name,
        enrollmentNumber,
        jiitPortalUsername,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { enrollmentNumber }],
    });

    if (existingUser) {
      return res.render("auth/register", {
        error: "User with this email or enrollment number already exists",
        name,
        jiitPortalUsername,
      });
    }

    // Create new user
    const newUser = new User({
      name,
      email,
      password,
      enrollmentNumber,
      jiitPortalUsername,
      jiitPortalPassword,
    });

    await newUser.save();

    // Send verification email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    // Store token in database (implementation omitted)
    sendVerificationEmail(email, verificationToken);

    req.flash(
      "success_msg",
      "You are now registered. Please check your email to verify your account."
    );
    res.redirect("/auth/login");
  } catch (err) {
    console.error(err);
    res.render("auth/register", {
      error: "An error occurred during registration",
    });
  }
});

// Login
router.get("/login", isNotAuthenticated, (req, res) => {
  res.render("auth/login");
});

router.post("/login", isNotAuthenticated, (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout
router.get("/logout", isAuthenticated, (req, res) => {
  req.logout();
  req.flash("success_msg", "You are logged out");
  res.redirect("/auth/login");
});

// Email verification
router.get("/verify/:token", async (req, res) => {
  try {
    const { token } = req.params;
    // Verify token and mark user as verified (implementation omitted)
    res.redirect("/auth/login?verified=true");
  } catch (err) {
    console.error(err);
    res.redirect("/auth/login?verified=false");
  }
});

module.exports = router;
