import jiitPortalClient from "./jiitPortalService.js";

export const fetchUserAttendance = async (username, password) => {
  try {
    const attendanceResult = await jiitPortalClient.getAttendance(
      username,
      password
    );

    if (!attendanceResult.success) {
      return {
        success: false,
        message: "Failed to fetch attendance",
      };
    }

    return {
      success: true,
      attendance: attendanceResult.attendance,
    };
  } catch (error) {
    console.error("Attendance Fetch Error:", error);
    return {
      success: false,
      message: "Internal server error",
    };
  }
};
