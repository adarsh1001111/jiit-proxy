// Required modules
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import flash from "connect-flash";

// Get directory paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import indexRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import proxyRouter from "./routes/proxy.js";
import profileRouter from "./routes/profile.js";
import adminRouter from "./routes/admin.js";
import paymentRouter from "./routes/payment.js";
import verificationRouter from "./routes/verification.js";

// Import passport config
import configurePassport from "./config/passport.js";

// Initialize app
const app = express();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);
app.use(flash());

// Configure passport
configurePassport(passport);
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
app.set("views", join(__dirname, "views"));

// Routes
app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/proxy", proxyRouter);
app.use("/profile", profileRouter);
app.use("/admin", adminRouter);
app.use("/payment", paymentRouter);
app.use("/verification", verificationRouter);

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
