import express from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import crypto from "crypto";
import { WebPortal } from "jsjiit";
import User from "../models/User.js";
import { isNotAuthenticated, isAuthenticated } from "../middlewares/auth.js";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

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

    if (!email.endsWith("@jiit.ac.in") && !email.endsWith("@mail.jiit.ac.in")) {
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

    // Validate JIIT credentials
    try {
      const jiit = new JSJIIT();
      await jiit.login(jiitPortalUsername, jiitPortalPassword);

      // Get user details to verify
      const userInfo = await jiit.getUserInfo();
      console.log("User info:", userInfo);

      // Additional verification could be done here
    } catch (jiitError) {
      console.error("JIIT Portal validation error:", jiitError);
      return res.render("auth/register", {
        error:
          "Invalid JIIT portal credentials. Please check your username and password.",
        name,
        email,
        enrollmentNumber,
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
      isVerified: true, // Auto-verify since JIIT credentials are valid
    });

    await newUser.save();

    req.flash("success_msg", "You are now registered and can log in");
    res.redirect("/auth/login");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("auth/register", {
      error: "An error occurred during registration",
      name: req.body.name,
      email: req.body.email,
      enrollmentNumber: req.body.enrollmentNumber,
      jiitPortalUsername: req.body.jiitPortalUsername,
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
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.flash("success_msg", "You are logged out");
    res.redirect("/auth/login");
  });
});

// Export router
export default router;
