const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const { renderDashboard } = require("../controllers/dashboardController");

// Define your routes here

module.exports = router; // Home route
router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  res.render("index", { title: "Home" });
});

// Dashboard route
router.get("/dashboard", isAuthenticated, renderDashboard);

// About route
router.get("/about", (req, res) => {
  res.render("about", {
    user: req.user,
  });
});

// Contact route
router.get("/contact", (req, res) => {
  res.render("contact", {
    user: req.user,
  });
});

// Terms route
router.get("/terms", (req, res) => {
  res.render("terms", {
    user: req.user,
  });
});

// Privacy route
router.get("/privacy", (req, res) => {
  res.render("privacy", {
    user: req.user,
  });
});

module.exports = router;
