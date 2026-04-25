import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const getEnv = (key) => {
  const val = process.env[key];
  if (!val) return null;
  // Strip surrounding quotes if they exist
  return val.replace(/^["'](.+)["']$/, '$1');
};

const serviceAccount = {
  project_id: getEnv("FIREBASE_PROJECT_ID"),
  private_key: getEnv("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
  client_email: getEnv("FIREBASE_CLIENT_EMAIL"),
};

if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  const missing = [];
  if (!serviceAccount.project_id) missing.push("FIREBASE_PROJECT_ID");
  if (!serviceAccount.private_key) missing.push("FIREBASE_PRIVATE_KEY");
  if (!serviceAccount.client_email) missing.push("FIREBASE_CLIENT_EMAIL");
  
  console.warn(`[Firebase Admin]: Missing credentials (${missing.join(", ")}). Push notifications will not work.`);
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
