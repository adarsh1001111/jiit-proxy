import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import ProxyRequest from "../models/ProxyRequest.js";
import { verifyAttendance } from "../services/verificationService.js";

const router = express.Router();

// Manually verify attendance for a proxy request (mostly for testing)
router.post("/manual/:id", isAuthenticated, async (req, res) => {
  try {
    const proxyRequest = await ProxyRequest.findById(req.params.id);

    if (!proxyRequest) {
      req.flash("error_msg", "Proxy request not found");
      return res.redirect("/dashboard");
    }

    // Only allow verification for assigned proxies
    if (proxyRequest.status !== "assigned") {
      req.flash("error_msg", "Cannot verify attendance for this proxy request");
      return res.redirect("/dashboard");
    }

    // Only allow the requester or provider to verify
    if (
      proxyRequest.requester.toString() !== req.user._id.toString() &&
      proxyRequest.provider.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      req.flash("error_msg", "Unauthorized access");
      return res.redirect("/dashboard");
    }

    // Perform attendance verification
    const result = await verifyAttendance(proxyRequest._id);

    if (result) {
      req.flash("success_msg", "Attendance verified successfully");
    } else {
      req.flash("error_msg", "Attendance verification failed");
    }

    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error during attendance verification");
    res.redirect("/dashboard");
  }
});

// Check verification status
router.get("/status/:id", isAuthenticated, async (req, res) => {
  try {
    const proxyRequest = await ProxyRequest.findById(req.params.id);

    if (!proxyRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Proxy request not found" });
    }

    // Only allow the requester or provider to check status
    if (
      proxyRequest.requester.toString() !== req.user._id.toString() &&
      proxyRequest.provider.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    res.json({
      success: true,
      status: proxyRequest.status,
      attendanceVerified: proxyRequest.attendanceVerified,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Error checking verification status" });
  }
});

// Trigger automatic verification for all pending proxies
router.post("/trigger-all", isAuthenticated, async (req, res) => {
  try {
    // Only allow admins to trigger verification for all proxies
    if (!req.user.isAdmin) {
      req.flash("error_msg", "Unauthorized access");
      return res.redirect("/dashboard");
    }

    import("../services/verificationService.js").then(async (module) => {
      await module.scheduleVerifications();

      req.flash(
        "success_msg",
        "Verification process triggered for all pending proxies"
      );
      res.redirect("/admin/dashboard");
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error triggering verification process");
    res.redirect("/admin/dashboard");
  }
});

export default router;
