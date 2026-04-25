import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "khubaibsyed820@gmail.com",
    pass: "vehgyuemwdduaxem",
  },
});

const carrierGateways = {
  verizon: "vtext.com",
  att: "txt.att.net",
  tmobile: "tmomail.net",
  sprint: "messaging.sprintpcs.com",
  cricket: "sms.cricketwireless.net",
  metro: "mymetropcs.com",
  jazz: "sms.jazz.com.pk",
  telenor: "telenor.com.pk",
  ufone: "ufone.com",
  zong: "zong.com.pk",
};

export async function sendOrderConfirmation(
  phoneNumber,
  carrier,
  orderDetails
) {
  try {
    const gateway = carrierGateways[carrier.toLowerCase()];

    if (!gateway) {
      throw new Error(`Unsupported carrier: ${carrier}`);
    }

    const smsEmail = `${phoneNumber}@${gateway}`;

    const smsMessage = `Order #${orderDetails.id} confirmed! Total: $${orderDetails.total}. We'll notify when shipped.`;

    const result = await transporter.sendMail({
      from: '"Your Store" <khubaibsyed820@gmail.com>',
      to: smsEmail,
      subject: "",
      text: smsMessage,
    });

    console.log(`SMS sent to ${phoneNumber} via ${carrier}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
}


sendOrderConfirmation("923162126865", "telenor", {
  id: "ORD-789123",
  total: 45.99,
  items: 2,
});

// sendOrderConfirmation("0987654321", "att", orderInfo);
