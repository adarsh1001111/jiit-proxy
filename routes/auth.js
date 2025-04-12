import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  registerWithJiitCredentials,
  loginWithJiitCredentials,
} from "../services/authService.js";
import User from "../models/User.js";

const router = express.Router();

// Regular Registration Route
router.get("/register", (req, res) => {
  // Render registration page
  res.render("auth/register", {
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg"),
  });
});

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword,
      jiitUsername,
      jiitPassword,
    } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      req.flash("error_msg", "Please fill in all fields");
      return res.redirect("/auth/register");
    }

    if (password !== confirmPassword) {
      req.flash("error_msg", "Passwords do not match");
      return res.redirect("/auth/register");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error_msg", "Email already registered");
      return res.redirect("/auth/register");
    }

    // Register with JIIT credentials
    const result = await registerWithJiitCredentials(
      email,
      password,
      jiitUsername,
      jiitPassword
    );

    if (!result.success) {
      req.flash("error_msg", result.message);
      return res.redirect("/auth/register");
    }

    // Flash success message and redirect to login
    req.flash("success_msg", "Registration successful. Please log in.");
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Registration Error:", error);
    req.flash("error_msg", "Server error during registration");
    res.redirect("/auth/register");
  }
});

// Login Route
router.get("/login", (req, res) => {
  res.render("auth/login", {
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg"),
  });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      req.flash("error_msg", "No user found with this email");
      return res.redirect("/auth/login");
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error_msg", "Invalid credentials");
      return res.redirect("/auth/login");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    req.flash("success_msg", "Login successful");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login Error:", error);
    req.flash("error_msg", "Server error during login");
    res.redirect("/auth/login");
  }
});

// Logout Route
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  req.flash("success_msg", "You are logged out");
  res.redirect("/auth/login");
});

export default router;
