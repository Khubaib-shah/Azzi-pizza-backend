import { messaging } from "../config/firebase.js";
import AdminDevice from "../models/AdminDevice.js";
import Notification from "../models/Notification.js";
import { io } from "../index.js";

/**
 * Send push notification to multiple tokens
 */
export const sendPushNotification = async (tokens, payload) => {
  if (!messaging || !tokens.length) return;

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
    });

    console.log(`[FCM]: Successfully sent ${response.successCount} messages`);

    // Handle failures and clean up invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errorCode = res.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await AdminDevice.deleteMany({ fcmToken: { $in: tokensToRemove } });
        console.log(`[FCM]: Cleaned up ${tokensToRemove.length} invalid tokens`);
      }
    }
  } catch (error) {
    console.error("[FCM]: Error sending multicast message", error);
  }
};

/**
 * Handle new order notification flow
 */
export const handleNewOrderNotification = async (order) => {
  try {
    // 1. Persist notification in DB
    const notification = await Notification.create({
      type: "NEW_ORDER",
      title: "New Order received! 🍕",
      message: `Order #${order._id.toString().slice(-6)} for ${order.name || "Customer"}`,
      orderId: order._id,
      isRead: false,
    });

    // 2. Emit real-time event via Socket.IO
    io.emit("new-notification", notification);
    console.log("[Socket]: Emitted new-notification for order", order._id);

    // 3. Send Push Notification to all registered admin devices
    const devices = await AdminDevice.find();
    const tokens = devices.map((d) => d.fcmToken);

    if (tokens.length > 0) {
      await sendPushNotification(tokens, {
        title: notification.title,
        body: notification.message,
        data: {
          orderId: order._id.toString(),
        },
      });
    }
  } catch (error) {
    console.error("[NotificationService]: Error handling new order", error);
  }
};
