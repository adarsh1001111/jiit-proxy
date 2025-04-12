import User from "../models/User.js";
import ProxyRequest from "../models/ProxyRequest.js";

// Render dashboard page
export const renderDashboard = async (req, res) => {
  try {
    // Get requested proxies (as requester)
    const requestedProxies = await ProxyRequest.find({
      requester: req.user._id,
      status: "open",
    }).sort({ date: 1 });

    // Get accepted proxies (as provider)
    const acceptedProxies = await ProxyRequest.find({
      provider: req.user._id,
      status: "assigned",
    })
      .populate("requester", "name rating")
      .sort({ date: 1 });

    // Get upcoming classes (this would typically be fetched from the JIIT portal)
    // For demo purposes, we'll create some sample data
    const upcomingClasses = [
      {
        course: "Computer Networks",
        courseCode: "CSE-301",
        date: new Date(new Date().setDate(new Date().getDate() + 1)),
        startTime: "10:00",
        endTime: "11:30",
        location: "LT-5",
      },
      {
        course: "Database Management",
        courseCode: "CSE-202",
        date: new Date(new Date().setDate(new Date().getDate() + 2)),
        startTime: "13:00",
        endTime: "14:30",
        location: "Lab-301",
      },
      {
        course: "Software Engineering",
        courseCode: "CSE-401",
        date: new Date(new Date().setDate(new Date().getDate() + 3)),
        startTime: "15:00",
        endTime: "16:30",
        location: "LT-2",
      },
    ];

    // Get top proxy providers
    const topProviders = await User.find()
      .sort({ successfulProxies: -1, rating: -1 })
      .limit(10);

    res.render("dashboard", {
      user: req.user,
      requestedProxies,
      acceptedProxies,
      upcomingClasses,
      topProviders,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load dashboard data");
    res.render("dashboard", {
      user: req.user,
      requestedProxies: [],
      acceptedProxies: [],
      upcomingClasses: [],
      topProviders: [],
    });
  }
};
