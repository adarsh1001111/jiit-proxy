// middlewares/auth.js
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error_msg", "Please log in to access this page");
  res.redirect("/auth/login");
};

export const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/dashboard");
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  req.flash("error_msg", "You do not have permission to access this page");
  res.redirect("/dashboard");
};
