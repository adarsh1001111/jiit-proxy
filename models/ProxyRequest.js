const mongoose = require("mongoose");

const ProxyRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  course: {
    type: String,
    required: true,
  },
  courseCode: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 50, // Minimum amount for a proxy
  },
  status: {
    type: String,
    enum: ["open", "assigned", "completed", "failed", "canceled"],
    default: "open",
  },
  paymentId: {
    type: String,
    required: true,
  },
  attendanceVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ProxyRequest", ProxyRequestSchema);
