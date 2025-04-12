const crypto = require("crypto");

// Generate transaction ID
const generateTransactionId = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Format date to readable format
const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Format time to readable format
const formatTime = (time) => {
  // Convert 24-hour format to 12-hour format with AM/PM
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const period = h >= 12 ? "PM" : "AM";
  const formattedHours = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${formattedHours}:${minutes} ${period}`;
};

// Calculate time difference in minutes
const calculateTimeDifference = (startTime, endTime) => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  return endTotalMinutes - startTotalMinutes;
};

module.exports = {
  generateTransactionId,
  formatDate,
  formatTime,
  calculateTimeDifference,
};
