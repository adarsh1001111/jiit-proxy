const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// User profile page
router.get("/", isAuthenticated, (req, res) => {
  res.render("profile", {
    user: req.user,
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
  });
});

// Update profile
router.post("/update", isAuthenticated, async (req, res) => {
  try {
    const { name, jiitPortalUsername, jiitPortalPassword } = req.body;

    // Get current user
    const user = await User.findById(req.user._id);

    // Update fields
    user.name = name;
    user.jiitPortalUsername = jiitPortalUsername;

    // Only update password if provided
    if (jiitPortalPassword && jiitPortalPassword.trim() !== "") {
      // Encrypt JIIT portal password for security
      const portalSalt = await bcrypt.genSalt(10);
      user.jiitPortalPassword = await bcrypt.hash(
        jiitPortalPassword,
        portalSalt
      );
    }

    await user.save();

    req.flash("success_msg", "Profile updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to update profile");
    res.redirect("/profile");
  }
});

// Change password
router.post("/change-password", isAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate passwords
    if (newPassword !== confirmPassword) {
      req.flash("error_msg", "New passwords do not match");
      return res.redirect("/profile");
    }

    // Get current user
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.validatePassword(currentPassword);

    if (!isMatch) {
      req.flash("error_msg", "Current password is incorrect");
      return res.redirect("/profile");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    req.flash("success_msg", "Password changed successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to change password");
    res.redirect("/profile");
  }
});

module.exports = router;
