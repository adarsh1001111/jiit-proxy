const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@jiit\.ac\.in$/,
  },
  password: {
    type: String,
    required: true,
  },
  enrollmentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  jiitPortalUsername: {
    type: String,
    required: true,
  },
  jiitPortalPassword: {
    type: String,
    required: true,
  },
  walletBalance: {
    type: Number,
    default: 0,
  },
  successfulProxies: {
    type: Number,
    default: 0,
  },
  failedProxies: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Password hash middleware
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Encrypt JIIT portal password for security
    const portalSalt = await bcrypt.genSalt(10);
    this.jiitPortalPassword = await bcrypt.hash(
      this.jiitPortalPassword,
      portalSalt
    );

    next();
  } catch (err) {
    next(err);
  }
});

// Method to validate password
UserSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", UserSchema);
