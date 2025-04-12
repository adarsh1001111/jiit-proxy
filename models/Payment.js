const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  proxyRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProxyRequest",
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "deposit",
      "withdrawal",
      "proxy-payment",
      "proxy-refund",
      "proxy-earning",
    ],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentMethod: {
    type: String,
    enum: ["upi", "card", "netbanking", "wallet", "internal"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", PaymentSchema);
