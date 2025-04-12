const cron = require("node-cron");
const { scheduleVerifications } = require("../services/verificationService");

// Schedule attendance verification to run every hour
const scheduleAttendanceVerification = () => {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("Running scheduled attendance verification...");
    try {
      await scheduleVerifications();
      console.log("Attendance verification completed");
    } catch (error) {
      console.error("Error running attendance verification:", error);
    }
  });
};

// Clear expired proxy requests (older than 24 hours and still open)
const clearExpiredProxyRequests = () => {
  const ProxyRequest = require("../models/ProxyRequest");
  const Payment = require("../models/Payment");
  const User = require("../models/User");

  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Clearing expired proxy requests...");
    try {
      // Find expired proxy requests
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const expiredRequests = await ProxyRequest.find({
        status: "open",
        createdAt: { $lt: yesterday },
      });

      console.log(`Found ${expiredRequests.length} expired proxy requests`);

      // Process each expired request
      for (const request of expiredRequests) {
        // Update request status
        request.status = "canceled";
        await request.save();

        // Refund payment to user
        const user = await User.findById(request.requester);
        user.walletBalance += request.amount;
        await user.save();

        // Create refund record
        const payment = new Payment({
          user: request.requester,
          proxyRequest: request._id,
          amount: request.amount,
          type: "proxy-refund",
          status: "completed",
          transactionId: require("crypto").randomBytes(16).toString("hex"),
          paymentMethod: "internal",
        });

        await payment.save();
      }

      console.log("Expired proxy requests cleared successfully");
    } catch (error) {
      console.error("Error clearing expired proxy requests:", error);
    }
  });
};

// Initialize all scheduled jobs
const initializeJobs = () => {
  scheduleAttendanceVerification();
  clearExpiredProxyRequests();

  console.log("Scheduled jobs initialized");
};

module.exports = {
  initializeJobs,
};
