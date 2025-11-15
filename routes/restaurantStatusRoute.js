import express from "express";
import Settings from "../models/restaurantStatus.js";
const router = express.Router();

router.route("/restaurant-status").get(async (req, res) => {
    const status = await Settings.findOne({ _id: "restaurantStatus" });
    res.json({ isOpen: status?.isOpen ?? false });
}).post(async (req, res) => {
    const { isOpen } = req.body;
    const updated = await Settings.findOneAndUpdate(
        { _id: "restaurantStatus" },
        { isOpen },
        { upsert: true, new: true }
    );
    res.json(updated);
});

router.route("/toggle-status").post(async (req, res) => {
    const status = await Settings.findOne({ _id: "restaurantStatus" });
    const updated = await Settings.findOneAndUpdate(
        { _id: "restaurantStatus" },
        { isOpen: !status?.isOpen },
        { upsert: true, new: true }
    );
    res.json(updated);
});


export default router;
