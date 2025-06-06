import express from "express";
import {
  handleCancel,
  handleSuccess,
  payForOrder,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-payment", payForOrder);

router.post("/success", handleSuccess);

router.get("/cancel", handleCancel);

export default router;
