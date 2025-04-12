// services/verificationService.js
import { WebPortal } from "jsjiit";
import User from "../models/User.js";
import ProxyRequest from "../models/ProxyRequest.js";
import { transferProxyPayment, refundProxyPayment } from "./paymentService.js";

// Verify attendance for a specific proxy request
export const verifyAttendance = async (proxyRequestId) => {
  try {
    const proxyRequest = await ProxyRequest.findById(proxyRequestId)
      .populate("requester")
      .populate("provider");

    if (!proxyRequest || proxyRequest.status !== "assigned") {
      console.log(`Invalid proxy request status: ${proxyRequest?.status}`);
      return false;
    }

    const requester = proxyRequest.requester;
    const portalPassword = requester.getDecryptedPortalPassword();

    if (!portalPassword) {
      console.error("Failed to decrypt portal password");
      return false;
    }

    // Use JSJIIT to check attendance
    try {
      const jiit = new JSJIIT();
      await jiit.login(requester.jiitPortalUsername, portalPassword);

      // Get attendance data
      const attendanceData = await jiit.getAttendance();
      console.log("Attendance data:", attendanceData);

      // Find the right course by code and date
      const courseDate = new Date(proxyRequest.date).toLocaleDateString(
        "en-IN"
      );
      const matchingAttendance = attendanceData.find(
        (item) =>
          item.courseCode === proxyRequest.courseCode &&
          new Date(item.date).toLocaleDateString("en-IN") === courseDate
      );

      const isPresent = matchingAttendance?.status === "Present";

      // Update proxy request with attendance status
      proxyRequest.attendanceVerified = true;

      if (isPresent) {
        proxyRequest.status = "completed";

        // Transfer payment to provider
        await transferProxyPayment(proxyRequest);

        // Update provider's successful proxies count
        const provider = proxyRequest.provider;
        provider.successfulProxies += 1;
        await provider.save();
      } else {
        proxyRequest.status = "failed";

        // Refund payment to requester
        await refundProxyPayment(proxyRequest);

        // Update provider's failed proxies count
        const provider = proxyRequest.provider;
        provider.failedProxies += 1;
        await provider.save();
      }

      await proxyRequest.save();

      return isPresent;
    } catch (error) {
      console.error("JSJIIT error during verification:", error);
      return false;
    }
  } catch (error) {
    console.error("Attendance verification error:", error);
    return false;
  }
};

// Schedule verification for all assigned proxies
export const scheduleVerifications = async () => {
  try {
    // Find all assigned proxy requests that haven't been verified yet
    const pendingProxies = await ProxyRequest.find({
      status: "assigned",
      attendanceVerified: false,
      // Look for classes that have ended at least 30 minutes ago
      date: { $lte: new Date() },
    });

    console.log(`Found ${pendingProxies.length} pending proxies to verify`);

    for (const proxy of pendingProxies) {
      await verifyAttendance(proxy._id);
    }
  } catch (error) {
    console.error("Error scheduling verifications:", error);
  }
};
