import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import jiitPortalClient from "./jiitPortalService.js";

export const loginWithJiitCredentials = async (username, password) => {
  try {
    // Verify JIIT portal credentials
    const loginResult = await jiitPortalClient.login(username, password);

    if (!loginResult.success) {
      return {
        success: false,
        message: "Invalid JIIT Portal credentials",
      };
    }

    // Find or create user
    let user = await User.findOne({ jiitPortalUsername: username });

    if (!user) {
      // Auto-create user if not exists
      const salt = await bcrypt.genSalt(10);
      const randomPassword = await bcrypt.hash(password, salt);

      user = new User({
        name: loginResult.userData.name || username,
        email: `${username}@jiit.ac.in`,
        password: randomPassword,
        jiitPortalUsername: username,
        jiitPortalPassword: randomPassword,
        isVerified: true,
      });

      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        jiitUsername: user.jiitPortalUsername,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      success: true,
      user,
      token,
      personalInfo: loginResult.userData,
    };
  } catch (error) {
    console.error("Login Error:", error);
    return {
      success: false,
      message: "Login failed",
    };
  }
};

export const registerWithJiitCredentials = async (
  email,
  password,
  jiitUsername,
  jiitPassword
) => {
  try {
    // Verify JIIT portal credentials
    const loginResult = await jiitPortalClient.login(
      jiitUsername,
      jiitPassword
    );

    if (!loginResult.success) {
      return {
        success: false,
        message: "Invalid JIIT Portal credentials",
      };
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { jiitPortalUsername: jiitUsername }],
    });

    if (existingUser) {
      return {
        success: false,
        message: "User already exists with this email or JIIT username",
      };
    }

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const hashedPortalPassword = await bcrypt.hash(jiitPassword, salt);

    // Create user
    const user = new User({
      name: loginResult.userData.name || jiitUsername,
      email,
      password: hashedPassword,
      jiitPortalUsername: jiitUsername,
      jiitPortalPassword: hashedPortalPassword,
      isVerified: true,
    });

    await user.save();

    return {
      success: true,
      user,
      personalInfo: loginResult.userData,
    };
  } catch (error) {
    console.error("Registration Error:", error);
    return {
      success: false,
      message: "Registration failed",
    };
  }
};
