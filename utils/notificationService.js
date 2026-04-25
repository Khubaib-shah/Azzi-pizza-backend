import { messaging } from "../config/firebase.js";
import AdminDevice from "../models/AdminDevice.js";
import Notification from "../models/Notification.js";
import { io } from "../index.js";

/**
 * Send push notification to multiple tokens with mobile optimizations
 */
export const sendPushNotification = async (tokens, payload) => {
  if (!messaging) {
    console.error("[FCM]: Messaging not initialized. Check Firebase credentials.");
    return;
  }

  if (!tokens.length) {
    console.warn("[FCM]: No tokens provided for notification.");
    return;
  }

  console.log(`[FCM]: Attempting to send to ${tokens.length} devices...`);

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK", // Often helps with click handling
          channelId: "high_priority",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
    });

    console.log(`[FCM]: Successfully sent ${response.successCount} messages. Failures: ${response.failureCount}`);

    // Handle failures and clean up invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const errorCode = res.error?.code;
          console.error(`[FCM]: Token ${idx} failed with error: ${errorCode}`);
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
        console.log(`[FCM]: Cleaned up ${tokensToRemove.length} invalid tokens from database`);
      }
    }
  } catch (error) {
    console.error("[FCM]: Critical error sending multicast message", error);
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
