import paypal from "paypal-rest-sdk";
import Order from "../models/OrderModel.js";
import { sendNewOrder } from "../utils/realTimeOrders.js";

paypal.configure({
  mode: process.env.PAYPAL_MODE,
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_SECRET,
});

export const payForOrder = async (req, res) => {
  console.log("Received payment request:", req.body);

  try {
    // console.log("Step 1: Destructuring body");   
    const {
      items,
      total: clientTotal,
      name,
      phoneNumber,
      deliveryAddress,
      doorbellName,
      deliveryTime,
      customizations
    } = req.body;

    // console.log("Step 2: Creating Order Instance");
    const newOrder = new Order({
      items,
      name,
      phoneNumber,
      totalPrice: clientTotal,
      deliveryAddress,
      doorbellName,
      deliveryTime,
      customizations,
      paymentMethod: "paypal",
      paymentStatus: "Pending",
      orderStatus: "Pending",
    });

    // console.log("Step 3: Saving Order");
    const savedOrder = await newOrder.save();
    // console.log("Step 4: Order Saved", savedOrder._id);

    const paypalItems = items.map((item) => ({
      name: item.name,
      price: Number(item.price).toFixed(2),
      currency: "EUR",
      quantity: item.quantity,
    }));

    const subtotal = paypalItems.reduce((sum, item) => {
      return sum + Number(item.price) * item.quantity;
    }, 0);

    const shipping = 0;
    const tax = 0;

    const total = subtotal + shipping + tax;

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `${process.env.CLIENT_URL}/payment-success?orderId=${savedOrder._id}&order=${encodeURIComponent(name)}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      },
      transactions: [
        {
          item_list: {
            items: paypalItems,
          },
          amount: {
            currency: "EUR",
            total: total.toFixed(2),
            details: {
              subtotal: subtotal.toFixed(2),
              shipping: shipping.toFixed(2),
              tax: tax.toFixed(2),
            },
          },
          description: "A purchase from Azzi Pizza",
        },
      ],
    };

    // console.log("Step 5: Invoking PayPal Create");
    paypal.payment.create(create_payment_json, (error, payment) => {
      if (error) {
        console.error("PayPal Create Error:", JSON.stringify(error, null, 2));
        if (error.response) {
          console.error("PayPal Error Response:", JSON.stringify(error.response, null, 2));
        }
        return res.status(500).json({
          message: "Payment creation failed",
          details: error.response || error.message || error
        });
      }

      const approvalUrl = payment.links.find(
        (link) => link.rel === "approval_url"
      )?.href;

      if (!approvalUrl) {
        return res.status(500).json({ message: "No approval URL found" });
      }

      res.json({ approvalUrl });
    });
  } catch (error) {
    console.error("Payment Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const handleSuccess = async (req, res) => {
  try {
    const { paymentId, PayerID, orderId } = req.body;

    if (!paymentId || !PayerID || !orderId) {
      console.error("Missing data in request body");
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    paypal.payment.get(paymentId, async (error, payment) => {
      if (error) {
        console.error("PayPal GET error:", error.response || error);
        return res.status(500).json({
          success: false,
          message: "Failed to get payment",
          error: error.response || error,
        });
      }

      if (payment.state === "approved") {
        console.log("Already approved. Updating DB.");

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { paymentStatus: "Completed" }, { new: true });
        await sendNewOrder(orderId);

        return res.status(200).json({
          success: true,
          message: "Already approved",
          orderId,
        });
      }

      paypal.payment.execute(
        paymentId,
        { payer_id: PayerID },
        async (err, executed) => {
          if (err) {
            console.error("Execution error:", err.response || err);

            if (
              err.response?.name === "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED"
            ) {
              console.warn(
                "Already attempted too many times. Marking as paid."
              );
              await Order.findByIdAndUpdate(orderId, {
                paymentStatus: "Completed",
              });
              await sendNewOrder(orderId);
              return res.status(200).json({
                success: true,
                message: "Payment previously completed",
                orderId,
              });
            }

            return res.status(500).json({
              success: false,
              message: "Execution failed",
              error: err.response || err,
            });
          }

          const updatedOrder = await Order.findByIdAndUpdate(orderId, {
            paymentStatus: "Completed",
          }, { new: true });
          await sendNewOrder(orderId);

          return res.status(200).json({
            success: true,
            message: "Payment success",
            orderId,
          });
        }
      );
    });
  } catch (e) {
    console.error("Catch error in handleSuccess:", e);
    res
      .status(500)
      .json({ success: false, message: "Unexpected server error" });
  }
};

export const handleCancel = (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/payment-cancelled`);
};
