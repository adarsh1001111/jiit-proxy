import nodemailer from "nodemailer";
import "dotenv/config";

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "user@example.com",
      pass: process.env.EMAIL_PASS || "password",
    },
  });
};

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    const verificationUrl = `${process.env.APP_URL}/auth/verify/${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "JIIT Proxy <noreply@jiitproxy.com>",
      to: email,
      subject: "Verify Your JIIT Proxy Account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your JIIT Proxy Account</h2>
          <p>Thank you for registering with JIIT Proxy. Please click the button below to verify your account:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #3B82F6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin: 20px 0;">
            Verify Account
          </a>
          <p>If the button doesn't work, you can also click the link below:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>Regards,<br>JIIT Proxy Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

// Send notification email
export const sendNotificationEmail = async (email, subject, message) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "JIIT Proxy <noreply@jiitproxy.com>",
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${message}
          <p>Regards,<br>JIIT Proxy Team</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Notification email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
};
