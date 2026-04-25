import mongoose from "mongoose";
import Settings from "../models/restaurantStatus.js";


const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
};

const seedStatus = async () => {
  await connectDB();
  const exists = await Settings.findById("restaurantStatus");
  if (!exists) {
    await Settings.create({ _id: "restaurantStatus", isOpen: false });
    console.log("Seeded restaurant status document");
  }
  process.exit();
};

seedStatus();
