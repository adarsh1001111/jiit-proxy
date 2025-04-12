import express from "express";
import { isAuthenticated, isAdmin } from "../middlewares/auth.js";
import User from "../models/User.js";
import ProxyRequest from "../models/ProxyRequest.js";
import Payment from "../models/Payment.js";
import { scheduleVerifications } from "../services/verificationService.js";

const router = express.Router();

// Admin dashboard
router.get("/dashboard", isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Get user stats
    const totalUsers = await User.countDocuments();
    const activeProxies = await ProxyRequest.countDocuments({
      status: { $in: ["open", "assigned"] },
    });
    const completedProxies = await ProxyRequest.countDocuments({
      status: "completed",
    });

    // Get recent transactions
    const recentTransactions = await Payment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "name email")
      .populate("proxyRequest");

    // Get pending withdrawal requests
    const pendingWithdrawals = await Payment.find({
      type: "withdrawal",
      status: "pending",
    })
      .sort({ createdAt: 1 })
      .populate("user", "name email");

    // Get top users by successful proxies
    const topProviders = await User.find()
      .sort({ successfulProxies: -1 })
      .limit(5);

    res.render("admin/dashboard", {
      user: req.user,
      totalUsers,
      activeProxies,
      completedProxies,
      recentTransactions,
      pendingWithdrawals,
      topProviders,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load admin dashboard");
    res.redirect("/dashboard");
  }
});

// Manage users
router.get("/users", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.render("admin/users", {
      user: req.user,
      users,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load users");
    res.redirect("/admin/dashboard");
  }
});

// View user details
router.get("/users/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    // Get user's proxy requests
    const proxyRequests = await ProxyRequest.find({
      $or: [{ requester: user._id }, { provider: user._id }],
    }).sort({ createdAt: -1 });

    // Get user's transactions
    const transactions = await Payment.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate("proxyRequest");

    res.render("admin/user-details", {
      user: req.user,
      targetUser: user,
      proxyRequests,
      transactions,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load user details");
    res.redirect("/admin/users");
  }
});

// Update user
router.post("/users/:id/update", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, walletBalance, isVerified, isAdmin } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    // Update user properties
    user.name = name;
    user.walletBalance = parseFloat(walletBalance);
    user.isVerified = isVerified === "true";
    user.isAdmin = isAdmin === "true";

    await user.save();

    req.flash("success_msg", "User updated successfully");
    res.redirect(`/admin/users/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to update user");
    res.redirect(`/admin/users/${req.params.id}`);
  }
});

// Delete user
router.post("/users/:id/delete", isAuthenticated, isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);

    req.flash("success_msg", "User deleted successfully");
    res.redirect("/admin/users");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to delete user");
    res.redirect("/admin/users");
  }
});

// Manage proxy requests
router.get("/proxies", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const proxies = await ProxyRequest.find()
      .sort({ createdAt: -1 })
      .populate("requester", "name email")
      .populate("provider", "name email");

    res.render("admin/proxies", {
      user: req.user,
      proxies,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load proxy requests");
    res.redirect("/admin/dashboard");
  }
});

// View proxy details
router.get("/proxies/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const proxy = await ProxyRequest.findById(req.params.id)
      .populate("requester")
      .populate("provider");

    if (!proxy) {
      req.flash("error_msg", "Proxy request not found");
      return res.redirect("/admin/proxies");
    }

    // Get related payments
    const payments = await Payment.find({ proxyRequest: proxy._id });

    res.render("admin/proxy-details", {
      user: req.user,
      proxy,
      payments,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load proxy details");
    res.redirect("/admin/proxies");
  }
});

// Update proxy status
router.post(
  "/proxies/:id/update",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { status, attendanceVerified } = req.body;

      const proxy = await ProxyRequest.findById(req.params.id);

      if (!proxy) {
        req.flash("error_msg", "Proxy request not found");
        return res.redirect("/admin/proxies");
      }

      // Update proxy properties
      proxy.status = status;
      proxy.attendanceVerified = attendanceVerified === "true";

      await proxy.save();

      req.flash("success_msg", "Proxy request updated successfully");
      res.redirect(`/admin/proxies/${req.params.id}`);
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Failed to update proxy request");
      res.redirect(`/admin/proxies/${req.params.id}`);
    }
  }
);

// Delete proxy
router.post(
  "/proxies/:id/delete",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      await ProxyRequest.findByIdAndDelete(req.params.id);

      req.flash("success_msg", "Proxy request deleted successfully");
      res.redirect("/admin/proxies");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Failed to delete proxy request");
      res.redirect("/admin/proxies");
    }
  }
);

// Manage withdrawals
router.get("/withdrawals", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const withdrawals = await Payment.find({
      type: "withdrawal",
    })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.render("admin/withdrawals", {
      user: req.user,
      withdrawals,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load withdrawals");
    res.redirect("/admin/dashboard");
  }
});

// Process withdrawal
router.post(
  "/withdrawals/:id/process",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      const { status } = req.body;

      const withdrawal = await Payment.findById(req.params.id);

      if (!withdrawal) {
        req.flash("error_msg", "Withdrawal not found");
        return res.redirect("/admin/withdrawals");
      }

      if (withdrawal.type !== "withdrawal") {
        req.flash("error_msg", "Invalid payment type");
        return res.redirect("/admin/withdrawals");
      }

      // If rejecting the withdrawal, refund the amount
      if (status === "failed" && withdrawal.status === "pending") {
        const user = await User.findById(withdrawal.user);
        user.walletBalance += withdrawal.amount;
        await user.save();
      }

      // Update withdrawal status
      withdrawal.status = status;
      await withdrawal.save();

      req.flash("success_msg", `Withdrawal ${status} successfully`);
      res.redirect("/admin/withdrawals");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Failed to process withdrawal");
      res.redirect("/admin/withdrawals");
    }
  }
);

// Trigger attendance verification
router.post(
  "/verify-attendance",
  isAuthenticated,
  isAdmin,
  async (req, res) => {
    try {
      await scheduleVerifications();

      req.flash("success_msg", "Attendance verification process triggered");
      res.redirect("/admin/dashboard");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Failed to trigger attendance verification");
      res.redirect("/admin/dashboard");
    }
  }
);

export default router;
