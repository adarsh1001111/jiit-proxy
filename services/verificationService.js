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

// Decrypt JIIT portal password (secure implementation)
const decryptPortalPassword = async (encryptedPassword) => {
  try {
    // In a production environment, use a proper encryption/decryption method
    // This is a simplified version for demonstration
    const key = process.env.ENCRYPTION_KEY || "default_encryption_key";
    const decipher = crypto.createDecipher("aes-256-cbc", key);
    let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Password decryption error:", error);
    return null;
  }
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
    const portalPassword = await decryptPortalPassword(
      proxyRequest.requester.jiitPortalPassword
    );

    if (!portalPassword) {
      console.error("Failed to decrypt portal password");
      return false;
    }

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    try {
      // Login to JIIT portal
      await page.goto("https://webportal.jiit.ac.in/login", {
        waitUntil: "networkidle2",
      });
      await page.type("#username", proxyRequest.requester.jiitPortalUsername);
      await page.type("#password", portalPassword);
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForNavigation({ waitUntil: "networkidle2" });

      // Check if login was successful
      const isLoggedIn = await page.evaluate(() => {
        return !document.querySelector(".login-error");
      });

      if (!isLoggedIn) {
        console.error("Failed to login to JIIT portal");
        await browser.close();
        return false;
      }

      // Navigate to attendance page
      await page.goto("https://webportal.jiit.ac.in/attendance", {
        waitUntil: "networkidle2",
      });

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
      console.error("Error during portal navigation:", error);
      await browser.close();
      return false;
    }
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
