import { io } from "../index.js";
import Order from "../models/OrderModel.js";

export const sendNewOrder = async (orderId) => {
  try {
    const newOrder = await Order.findById(orderId).populate(
      "items.menuItem",
      "name price category"
    );
    if (!newOrder) return;
    io.emit("order:new", newOrder);
  } catch (error) {
    console.error("Error fetching new order:", error);
  }
};

export const sendUpdatedOrder = async (orderId) => {
  try {
    const updatedOrder = await Order.findById(orderId).populate(
      "items.menuItem",
      "name price category"
    );

    if (!updatedOrder) {
      console.warn(`Order with ID ${orderId} not found for update emit.`);
      return;
    }
    io.emit("order:update", updatedOrder);
  } catch (error) {
    console.error("Error emitting updated order:", error);
  }
};

export const sendDeletedOrderId = (orderId) => {
  try {
    io.emit("order:delete", orderId);
  } catch (error) {
    console.error("Error emitting deleted order ID:", error);
  }
};
