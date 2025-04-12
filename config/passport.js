// config/passport.js
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/User.js";

const configurePassport = (passport) => {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          // Match user
          const user = await User.findOne({ email });

          if (!user) {
            return done(null, false, { message: "Email is not registered" });
          }

          // Match password
          const isMatch = await user.validatePassword(password);

          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Password incorrect" });
          }
        } catch (err) {
          console.error(err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

export default configurePassport;
