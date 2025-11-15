import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import connectDB from "./config/DBconnect.js";
import { Server } from "socket.io";

import errorMiddleware from "./middleware/errorMiddleware.js";
import menuRoutes from "./routes/menuRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import restaurantStatusRoute from "./routes/restaurantStatusRoute.js";

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");

export const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("Request from:", req.headers.origin, req.method, req.url);
  next();
});

export const io = new Server(server, {
  cors: corsOptions,
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "api is working",
    menuRoutes: "/api/menu",
    orderRoutes: "/api/orders",
  });
});

app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/settings", restaurantStatusRoute);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
