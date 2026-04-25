import AdminDevice from "../models/AdminDevice.js";
import Notification from "../models/Notification.js";

/**
 * Register a new admin device token
 */
export const registerDevice = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: "fcmToken is required" });
    }

    // Check if token already exists
    let device = await AdminDevice.findOne({ fcmToken });
    if (!device) {
      device = await AdminDevice.create({ fcmToken });
    }

    res.status(200).json({ success: true, message: "Device registered successfully", device });
  } catch (error) {
    console.error("[NotificationController]: Error registering device", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Get count of registered devices
 */
export const getDeviceCount = async (req, res) => {
  try {
    const count = await AdminDevice.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send a test push notification
 */
export const testPush = async (req, res) => {
  try {
    const { sendPushNotification } = await import("../utils/notificationService.js");
    const devices = await AdminDevice.find();
    const tokens = devices.map((d) => d.fcmToken);

    if (tokens.length === 0) {
      return res.status(404).json({ success: false, message: "No registered devices found" });
    }

    await sendPushNotification(tokens, {
      title: "Test Notification 🍕",
      body: "If you see this, push notifications are working!",
      data: { test: "true" },
    });

    res.status(200).json({ success: true, deviceCount: tokens.length });
  } catch (error) {
    console.error("[NotificationController]: Error in test-push", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get notification history
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("[NotificationController]: Error fetching notifications", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("[NotificationController]: Error marking notification as read", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
