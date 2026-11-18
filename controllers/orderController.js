import {
  sendNewOrder,
  sendUpdatedOrder,
  sendDeletedOrderId,
} from "../utils/realTimeOrders.js";
import Menu from "../models/MenuModel.js";
import Order from "../models/OrderModel.js";
import { log } from "console";

export const createOrder = async (req, res) => {
  try {
    const {
      items,
      deliveryAddress,
      phoneNumber,
      name,
      total,
      customizations,
      paymentMethod,
      doorbellName,
      deliveryTime,
    } = req.body;

    console.log("req.body =>", req.body);

    if (!items?.length) {
      return res
        .status(400)
        .json({ message: "At least one item is required." });
    }

    const orderItems = [];

    for (const item of items) {
      const {
        menuItem: menuItemId,
        quantity,
        selectedIngredients = [],
        customizations: itemCustomizations = "",
      } = item;

      if (!menuItemId || !quantity) {
        return res.status(400).json({
          message: "Each item must have a menuItem and quantity.",
        });
      }

      const menuItem = await Menu.findById(menuItemId).populate("ingredients");
      if (!menuItem) {
        return res.status(404).json({
          message: `Menu item with ID ${menuItemId} not found.`,
        });
      }

      if (!Array.isArray(selectedIngredients)) {
        return res.status(400).json({
          message: "selectedIngredients must be an array of objects.",
        });
      }

      const matchedIngredients = selectedIngredients.map((ing) => {
        if (!ing._id || !ing.name || typeof ing.price !== "number") {
          throw new Error(
            "Each selected ingredient must include _id, name, and price."
          );
        }
        return {
          _id: ing._id,
          name: ing.name,
          price: ing.price,
        };
      });

      const basePrice = menuItem.price;
      const discountAmount =
        menuItem.discount && menuItem.discount > 0
          ? (menuItem.price * menuItem.discount) / 100
          : 0;
      const discountedPrice = parseFloat(
        (basePrice - discountAmount).toFixed(2)
      );

      orderItems.push({
        menuItem: menuItemId,
        name: menuItem.name,
        price: discountedPrice,
        originalPrice: basePrice,
        quantity,
        selectedIngredients: matchedIngredients,
        customizations: itemCustomizations || "",
      });
    }

    const validMethods = ["cash", "satispay", "scan", "bancomat", "paypal"];

    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method selected.",
      });
    }

    if (!deliveryAddress?.street || !deliveryAddress?.city) {
      return res.status(400).json({
        message: "Valid street and city in delivery address are required.",
      });
    }

    const newOrder = new Order({
      items: orderItems,
      name,
      totalPrice: total,
      deliveryAddress,
      phoneNumber,
      paymentMethod,
      doorbellName: doorbellName || "",
      deliveryTime: deliveryTime || null,
      orderNotes: customizations || "",
    });
    if (paymentMethod === "scan") {
      newOrder.paymentStatus = "Completed";
    }

    const savedOrder = await newOrder.save();
    await sendNewOrder(savedOrder._id);

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      message: "Error creating order",
      error: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const basePaymentFilter = {
      $or: [
        { paymentMethod: { $ne: "paypal" } },
        { paymentMethod: "paypal", paymentStatus: "Completed" },
      ],
    };

    const { page, limit, tab, status, search, startDate, endDate } = req.query;

    const buildDateFilter = () => {
      if (!startDate && !endDate) return null;
      const dateQuery = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateQuery.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateQuery.$lte = e;
      }
      return { createdAt: dateQuery };
    };

    // If no pagination params are passed, return list for analytics/reports (filtered by date if provided)
    if (!page && !limit) {
      const dateFilter = buildDateFilter();
      const fullQuery = dateFilter
        ? { $and: [basePaymentFilter, dateFilter] }
        : basePaymentFilter;
      const orders = await Order.find(fullQuery)
        .sort({ createdAt: -1 })
        .populate("items.menuItem", "name price category image");
      return res.status(200).json(orders);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const buildFilter = (targetTab) => {
      const andConditions = [basePaymentFilter];

      if (targetTab === "active") {
        andConditions.push({
          orderStatus: { $nin: ["Delivered", "Cancelled"] },
        });
      } else if (targetTab === "completed") {
        andConditions.push({
          orderStatus: { $in: ["Delivered", "Cancelled"] },
        });
      }

      if (status && status !== "All Statuses") {
        andConditions.push({ orderStatus: status });
      }

      if (startDate || endDate) {
        const dateQuery = {};
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          dateQuery.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          dateQuery.$lte = e;
        }
        andConditions.push({ createdAt: dateQuery });
      }

      if (search && search.trim()) {
        const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        andConditions.push({
          $or: [
            { name: regex },
            { phoneNumber: regex },
            { "deliveryAddress.street": regex },
            { doorbellName: regex },
            { "items.name": regex },
          ],
        });
      }

      return andConditions.length === 1
        ? andConditions[0]
        : { $and: andConditions };
    };

    const query = buildFilter(tab);
    const activeCountQuery = buildFilter("active");
    const completedCountQuery = buildFilter("completed");

    const [orders, total, activeCount, completedCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("items.menuItem", "name price category image"),
      Order.countDocuments(query),
      Order.countDocuments(activeCountQuery),
      Order.countDocuments(completedCountQuery),
    ]);

    return res.status(200).json({
      orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      activeCount,
      completedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.menuItem"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order", error });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, eta, paymentStatus } = req.body;

    const updateData = {};
    if (orderStatus) {
      updateData.orderStatus = orderStatus;
    }
    if (eta) {
      updateData.eta = eta;
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false }
    );


    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    await sendUpdatedOrder(req.params.id);

    res.status(200).json({
      message: "Order updated successfully",
      updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating order status", error });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    sendDeletedOrderId(req.params.id);

    console.log("Order deleted in real-time!");
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting order", error });
  }
};
