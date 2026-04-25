import express from "express";
import { registerDevice, getNotifications, markAsRead, getDeviceCount, testPush } from "../controllers/notificationController.js";

const router = express.Router();

router.post("/device", registerDevice);
router.get("/device/count", getDeviceCount);
router.post("/test-push", testPush);
router.get("/", getNotifications);
router.put("/:id/read", markAsRead);

export default router;
