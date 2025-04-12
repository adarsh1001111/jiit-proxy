import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import {
  addFundsToWallet,
  withdrawFundsFromWallet,
} from "../services/paymentService.js";
import crypto from "crypto";

const router = express.Router();

// Add funds page
router.get("/add-funds", isAuthenticated, (req, res) => {
  res.render("payment/add-funds", {
    user: req.user,
  });
});

// Process add funds
router.post("/add-funds", isAuthenticated, async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;

    // Validate amount
    if (!amount || amount < 50) {
      return res.render("payment/add-funds", {
        user: req.user,
        error: "Minimum amount to add is ₹50",
      });
    }

    // Generate transaction ID
    const transactionId = crypto.randomBytes(16).toString("hex");

    // Process payment (in real world, this would integrate with a payment gateway)
    const result = await addFundsToWallet(
      req.user._id,
      parseFloat(amount),
      paymentMethod,
      transactionId
    );

    if (!result.success) {
      return res.render("payment/add-funds", {
        user: req.user,
        error: result.message,
      });
    }

    req.flash("success_msg", `Successfully added ₹${amount} to your wallet`);
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("payment/add-funds", {
      user: req.user,
      error: "Failed to process payment",
    });
  }
});

// Withdraw funds page
router.get("/withdraw", isAuthenticated, (req, res) => {
  res.render("payment/withdraw", {
    user: req.user,
  });
});

// Process withdrawal
router.post("/withdraw", isAuthenticated, async (req, res) => {
  try {
    const { amount, paymentMethod, accountDetails } = req.body;

    // Validate amount
    if (!amount || amount < 100) {
      return res.render("payment/withdraw", {
        user: req.user,
        error: "Minimum withdrawal amount is ₹100",
      });
    }

    if (!accountDetails) {
      return res.render("payment/withdraw", {
        user: req.user,
        error: "Account details are required for withdrawal",
      });
    }

    // Process withdrawal
    const result = await withdrawFundsFromWallet(
      req.user._id,
      parseFloat(amount),
      paymentMethod
    );

    if (!result.success) {
      return res.render("payment/withdraw", {
        user: req.user,
        error: result.message,
      });
    }

    req.flash(
      "success_msg",
      `Withdrawal of ₹${amount} has been initiated. It will be processed within 24 hours.`
    );
    res.redirect("/dashboard");
  } catch (err) {
    console.error(err);
    res.render("payment/withdraw", {
      user: req.user,
      error: "Failed to process withdrawal",
    });
  }
});

// Transaction history
router.get("/transactions", isAuthenticated, async (req, res) => {
  try {
    const transactions = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("proxyRequest");

    res.render("payment/transactions", {
      user: req.user,
      transactions,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to fetch transaction history");
    res.redirect("/dashboard");
  }
});

export default router;
