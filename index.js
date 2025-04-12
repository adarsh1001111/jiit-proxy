// Required modules
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const flash = require("connect-flash");
const path = require("path");
require("dotenv").config();

// Initialize app
const app = express();
const expressLayouts = require("express-ejs-layouts");

app.set("view engine", "ejs");
app.use(expressLayouts); // Use layouts
app.set("layout", "layouts/main"); // Default layout
// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);
app.use(flash());

// Passport configuration
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());

// Global variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  res.locals.user = req.user || null;
  next();
});

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use("/proxy", require("./routes/proxy"));
app.use("/profile", require("./routes/profile"));
app.use("/admin", require("./routes/admin"));
app.use("/payment", require("./routes/payment"));
app.use("/verification", require("./routes/verification"));

// Initialize scheduled jobs
const { initializeJobs } = require("./jobs/scheduledJobs");
initializeJobs();

// Error handling
app.use((req, res, next) => {
  res.status(404).render("error", {
    error: "404 - Page not found",
    message: "The page you are looking for does not exist.",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    error: "500 - Server Error",
    message: "Something went wrong on our end.",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
