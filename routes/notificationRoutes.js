import express from "express";
import { registerDevice, getNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.post("/device", registerDevice);
router.get("/", getNotifications);
router.put("/:id/read", markAsRead);

export default router;
