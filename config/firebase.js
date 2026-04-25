import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  console.warn("[Firebase Admin]: Missing credentials. Push notifications will not work.");
} else {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase Admin]: Initialized successfully");
  } catch (err) {
    console.error("[Firebase Admin]: Initialization error", err);
  }
}

export const messaging = admin.apps.length > 0 ? admin.messaging() : null;
export default admin;
