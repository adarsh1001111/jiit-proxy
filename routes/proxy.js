const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/auth");
const ProxyRequest = require("../models/ProxyRequest");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { generateTransactionId } = require("../utils/helpers");
const { processProxyPayment } = require("../services/paymentService");

// Get all available proxy requests
router.get("/available", isAuthenticated, async (req, res) => {
  try {
    const proxyRequests = await ProxyRequest.find({
      status: "open",
      requester: { $ne: req.user._id },
      date: { $gte: new Date() },
    })
      .populate("requester", "name rating")
      .sort({ date: 1, startTime: 1 });

    res.render("proxy/available", { proxyRequests });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("error", { error: "Failed to fetch available proxy requests" });
  }
});

// Create new proxy request
router.get("/create", isAuthenticated, (req, res) => {
  res.render("proxy/create");
});

router.post("/create", isAuthenticated, async (req, res) => {
  try {
    const { course, courseCode, date, startTime, endTime, location, amount } =
      req.body;

    // Create transaction ID for payment
    const transactionId = generateTransactionId();

    // Process payment (hold funds)
    const paymentResult = await processProxyPayment(
      req.user._id,
      amount,
      transactionId
    );

    if (!paymentResult.success) {
      return res.render("proxy/create", {
        error: paymentResult.message,
        course,
        courseCode,
        date,
        startTime,
        endTime,
        location,
        amount,
      });
    }

    // Create proxy request
    const proxyRequest = new ProxyRequest({
      requester: req.user._id,
      course,
      courseCode,
      date: new Date(date),
      startTime,
      endTime,
      location,
      amount: parseFloat(amount),
      paymentId: paymentResult.paymentId,
    });

    await proxyRequest.save();

    req.flash("success_msg", "Proxy request created successfully");
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("proxy/create", {
      error: "Failed to create proxy request",
    });
  }
});

// Accept a proxy request
router.post("/accept/:id", isAuthenticated, async (req, res) => {
  try {
    const proxyRequest = await ProxyRequest.findById(req.params.id);

    if (!proxyRequest) {
      req.flash("error_msg", "Proxy request not found");
      return res.redirect("/proxy/available");
    }

    if (proxyRequest.status !== "open") {
      req.flash("error_msg", "This proxy request has already been taken");
      return res.redirect("/proxy/available");
    }

    if (proxyRequest.requester.toString() === req.user._id.toString()) {
      req.flash("error_msg", "You cannot accept your own proxy request");
      return res.redirect("/proxy/available");
    }

    // Update proxy request
    proxyRequest.provider = req.user._id;
    proxyRequest.status = "assigned";
    await proxyRequest.save();

    req.flash(
      "success_msg",
      "You have successfully accepted this proxy request"
    );
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to accept proxy request");
    res.redirect("/proxy/available");
  }
});

// View my proxy requests (as requester)
router.get("/my-requests", isAuthenticated, async (req, res) => {
  try {
    const proxyRequests = await ProxyRequest.find({ requester: req.user._id })
      .populate("provider", "name rating")
      .sort({ date: -1 });

    res.render("proxy/my-requests", { proxyRequests });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("error", { error: "Failed to fetch your proxy requests" });
  }
});

// View my proxy tasks (as provider)
router.get("/my-tasks", isAuthenticated, async (req, res) => {
  try {
    const proxyTasks = await ProxyRequest.find({ provider: req.user._id })
      .populate("requester", "name rating")
      .sort({ date: -1 });

    res.render("proxy/my-tasks", { proxyTasks });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .render("error", { error: "Failed to fetch your proxy tasks" });
  }
});

// Cancel a proxy request (as requester)
router.post("/cancel/:id", isAuthenticated, async (req, res) => {
  try {
    const proxyRequest = await ProxyRequest.findById(req.params.id);

    if (!proxyRequest) {
      req.flash("error_msg", "Proxy request not found");
      return res.redirect("/proxy/my-requests");
    }

    if (proxyRequest.requester.toString() !== req.user._id.toString()) {
      req.flash(
        "error_msg",
        "You are not authorized to cancel this proxy request"
      );
      return res.redirect("/proxy/my-requests");
    }

    if (["completed", "failed", "canceled"].includes(proxyRequest.status)) {
      req.flash("error_msg", "This proxy request cannot be canceled");
      return res.redirect("/proxy/my-requests");
    }

    // Update proxy request status
    proxyRequest.status = "canceled";
    await proxyRequest.save();

    // Process refund
    // Implementation omitted for brevity

    req.flash("success_msg", "Proxy request canceled successfully");
    res.redirect("/proxy/my-requests");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to cancel proxy request");
    res.redirect("/proxy/my-requests");
  }
});

module.exports = router;
