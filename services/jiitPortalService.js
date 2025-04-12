// services/jiitPortalService.js
import { WebPortal } from "jsjiit";

class JIITPortalClient {
  constructor() {
    this.portal = null;
  }

  async login(username, password) {
    try {
      // Create a new WebPortal instance each time
      this.portal = new WebPortal();

      // Attempt login
      await this.portal.student_login(username, password);

      // Fetch personal info to verify login
      const personalInfo = await this.portal.get_personal_info();

      return {
        success: true,
        message: "Login successful",
        userData: personalInfo,
      };
    } catch (error) {
      console.error("JIIT Portal Login Error:", error);
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  }

  async getAttendance() {
    if (!this.portal) {
      throw new Error("Not logged in");
    }

    try {
      // Get attendance metadata
      const meta = await this.portal.get_attendance_meta();
      const sem = meta.latest_semester();
      const header = meta.latest_header();

      // Fetch attendance
      const attendance = await this.portal.get_attendance(header, sem);

      return {
        success: true,
        attendance,
      };
    } catch (error) {
      console.error("Attendance Fetch Error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch attendance",
      };
    }
  }

  // Add other methods from the library as needed
  async getGrades() {
    if (!this.portal) {
      throw new Error("Not logged in");
    }

    try {
      const gradeCardSems = await this.portal.get_semesters_for_grade_card();
      const latestSem = gradeCardSems[0];
      const grades = await this.portal.get_grade_card(latestSem);

      return {
        success: true,
        grades,
      };
    } catch (error) {
      console.error("Grades Fetch Error:", error);
      return {
        success: false,
        message: error.message || "Failed to fetch grades",
      };
    }
  }
}

export default new JIITPortalClient();
