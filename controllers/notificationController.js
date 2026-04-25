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
