const puppeteer = require("puppeteer");
const User = require("../models/User");
const ProxyRequest = require("../models/ProxyRequest");
const Payment = require("../models/Payment");
const {
  transferProxyPayment,
  refundProxyPayment,
} = require("./paymentService");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Decrypt JIIT portal password
const decryptPortalPassword = async (encryptedPassword, key) => {
  // Simplified implementation - in real system, use secure decryption
  return (
    crypto
      .createDecipher("aes-256-cbc", key)
      .update(encryptedPassword, "hex", "utf8") +
    crypto.createDecipher("aes-256-cbc", key).final("utf8")
  );
};

// Verify attendance for a specific proxy request
const verifyAttendance = async (proxyRequestId) => {
  try {
    const proxyRequest = await ProxyRequest.findById(proxyRequestId)
      .populate("requester", "jiitPortalUsername jiitPortalPassword")
      .populate("provider");

    if (!proxyRequest || proxyRequest.status !== "assigned") {
      console.log(`Invalid proxy request status: ${proxyRequest?.status}`);
      return false;
    }

    // Decrypt JIIT portal password
    const key = process.env.ENCRYPTION_KEY;
    const portalPassword = await decryptPortalPassword(
      proxyRequest.requester.jiitPortalPassword,
      key
    );

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Login to JIIT portal
    await page.goto("https://webportal.jiit.ac.in/login");
    await page.type("#username", proxyRequest.requester.jiitPortalUsername);
    await page.type("#password", portalPassword);
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation();

    // Navigate to attendance page
    await page.goto("https://webportal.jiit.ac.in/attendance");

    // Extract attendance data
    const attendanceData = await page.evaluate(
      (courseCode, date) => {
        const rows = Array.from(
          document.querySelectorAll("table.attendance-table tr")
        );
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll("td"));
          if (cells.length >= 4) {
            const rowCourseCode = cells[0].textContent.trim();
            const rowDate = cells[1].textContent.trim();
            const status = cells[3].textContent.trim();

            // Format date from proxy request to match portal format
            const formattedDate = new Date(date).toLocaleDateString("en-IN");

            if (rowCourseCode === courseCode && rowDate === formattedDate) {
              return status === "Present";
            }
          }
        }
        return false;
      },
      proxyRequest.courseCode,
      proxyRequest.date
    );

    await browser.close();

    // Update proxy request with attendance status
    proxyRequest.attendanceVerified = attendanceData;

    if (attendanceData) {
      proxyRequest.status = "completed";

      // Transfer payment to provider
      await transferProxyPayment(proxyRequest);

      // Update provider's successful proxies count
      const provider = await User.findById(proxyRequest.provider);
      provider.successfulProxies += 1;
      await provider.save();
    } else {
      proxyRequest.status = "failed";

      // Refund payment to requester
      await refundProxyPayment(proxyRequest);

      // Update provider's failed proxies count
      const provider = await User.findById(proxyRequest.provider);
      provider.failedProxies += 1;
      await provider.save();
    }

    await proxyRequest.save();

    return attendanceData;
  } catch (error) {
    console.error("Attendance verification error:", error);
    return false;
  }
};

// Schedule verification for all assigned proxies
const scheduleVerifications = async () => {
  try {
    // Find all assigned proxy requests that haven't been verified yet
    const pendingProxies = await ProxyRequest.find({
      status: "assigned",
      attendanceVerified: false,
      // Look for classes that have ended at least 30 minutes ago
      $expr: {
        $lt: [
          {
            $add: [
              { $dateFromString: { dateString: "$date" } },
              {
                $multiply: [
                  {
                    $add: [
                      {
                        $multiply: [
                          { $toInt: { $substr: ["$endTime", 0, 2] } },
                          60 * 60 * 1000,
                        ],
                      },
                      {
                        $multiply: [
                          { $toInt: { $substr: ["$endTime", 3, 2] } },
                          60 * 1000,
                        ],
                      },
                    ],
                  },
                  1,
                ],
              },
              // Add 30 minutes (1800000 ms)
              1800000,
            ],
          },
          new Date(),
        ],
      },
    });

    console.log(`Found ${pendingProxies.length} pending proxies to verify`);

    for (const proxy of pendingProxies) {
      await verifyAttendance(proxy._id);
    }
  } catch (error) {
    console.error("Error scheduling verifications:", error);
  }
};

module.exports = {
  verifyAttendance,
  scheduleVerifications,
};
