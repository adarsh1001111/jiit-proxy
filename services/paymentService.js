import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { generateTransactionId } from "../utils/helpers.js";

// Add funds to user wallet
export const addFundsToWallet = async (
  userId,
  amount,
  paymentMethod,
  transactionId
) => {
  try {
    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount,
      type: "deposit",
      status: "completed", // In real app, this would be pending until payment gateway confirms
      transactionId,
      paymentMethod,
    });

    await payment.save();

    // Update user wallet balance
    user.walletBalance += amount;
    await user.save();

    return { success: true, paymentId: payment._id };
  } catch (error) {
    console.error("Error adding funds to wallet:", error);
    return { success: false, message: "Failed to process payment" };
  }
};

// Withdraw funds from user wallet
export const withdrawFundsFromWallet = async (
  userId,
  amount,
  paymentMethod
) => {
  try {
    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user has sufficient balance
    if (user.walletBalance < amount) {
      return { success: false, message: "Insufficient wallet balance" };
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount,
      type: "withdrawal",
      status: "pending", // Admin needs to approve withdrawals
      transactionId,
      paymentMethod,
    });

    await payment.save();

    // Update user wallet balance
    user.walletBalance -= amount;
    await user.save();

    return { success: true, paymentId: payment._id };
  } catch (error) {
    console.error("Error withdrawing funds from wallet:", error);
    return { success: false, message: "Failed to process withdrawal" };
  }
};

// Process payment for proxy request
export const processProxyPayment = async (userId, amount, transactionId) => {
  try {
    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user has sufficient balance
    if (user.walletBalance < amount) {
      return { success: false, message: "Insufficient wallet balance" };
    }

    // Create payment record
    const payment = new Payment({
      user: userId,
      amount,
      type: "proxy-payment",
      status: "completed",
      transactionId,
      paymentMethod: "wallet",
    });

    await payment.save();

    // Update user wallet balance
    user.walletBalance -= amount;
    await user.save();

    return { success: true, paymentId: payment._id };
  } catch (error) {
    console.error("Error processing proxy payment:", error);
    return { success: false, message: "Failed to process payment" };
  }
};

// Transfer payment to proxy provider
export const transferProxyPayment = async (proxyRequest) => {
  try {
    // Find provider
    const provider = await User.findById(proxyRequest.provider);

    if (!provider) {
      return { success: false, message: "Provider not found" };
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create payment record
    const payment = new Payment({
      user: provider._id,
      proxyRequest: proxyRequest._id,
      amount: proxyRequest.amount,
      type: "proxy-earning",
      status: "completed",
      transactionId,
      paymentMethod: "internal",
    });

    await payment.save();

    // Update provider wallet balance
    provider.walletBalance += proxyRequest.amount;
    await provider.save();

    return { success: true, paymentId: payment._id };
  } catch (error) {
    console.error("Error transferring proxy payment:", error);
    return { success: false, message: "Failed to transfer payment" };
  }
};

// Refund proxy payment to requester
export const refundProxyPayment = async (proxyRequest) => {
  try {
    // Find requester
    const requester = await User.findById(proxyRequest.requester);

    if (!requester) {
      return { success: false, message: "Requester not found" };
    }

    // Create transaction ID
    const transactionId = generateTransactionId();

    // Create payment record
    const payment = new Payment({
      user: requester._id,
      proxyRequest: proxyRequest._id,
      amount: proxyRequest.amount,
      type: "proxy-refund",
      status: "completed",
      transactionId,
      paymentMethod: "internal",
    });

    await payment.save();

    // Update requester wallet balance
    requester.walletBalance += proxyRequest.amount;
    await requester.save();

    return { success: true, paymentId: payment._id };
  } catch (error) {
    console.error("Error refunding proxy payment:", error);
    return { success: false, message: "Failed to refund payment" };
  }
};
