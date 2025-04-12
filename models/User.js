import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9._%+-]+@(jiit\.ac\.in|mail\.jiit\.ac\.in)$/,
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
  try {
    // Hash app password if modified
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // Encrypt JIIT portal password if modified
    if (this.isModified("jiitPortalPassword")) {
      // Use symmetric encryption instead of hashing to allow decryption later
      const key = process.env.ENCRYPTION_KEY || "default_key_for_development";
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        crypto
          .createHash("sha256")
          .update(key)
          .digest("base64")
          .substring(0, 32),
        Buffer.from("0000000000000000")
      ); // IV should be unique in production
      let encrypted = cipher.update(this.jiitPortalPassword, "utf8", "hex");
      encrypted += cipher.final("hex");
      this.jiitPortalPassword = encrypted;
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Method to decrypt portal password
UserSchema.methods.getDecryptedPortalPassword = function () {
  try {
    const key = process.env.ENCRYPTION_KEY || "default_key_for_development";
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      crypto.createHash("sha256").update(key).digest("base64").substring(0, 32),
      Buffer.from("0000000000000000")
    );
    let decrypted = decipher.update(this.jiitPortalPassword, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Password decryption error:", error);
    return null;
  }
};

// Method to validate password
UserSchema.methods.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", UserSchema);

export default mongoose.model("User", UserSchema);
