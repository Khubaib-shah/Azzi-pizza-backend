import mongoose from "mongoose";

const restaurantStatusSchema = new mongoose.Schema({
  _id: { type: String, default: "restaurantStatus" },
  isOpen: { type: Boolean, default: false },
});

const Settings = mongoose.model("RestaurantStatus", restaurantStatusSchema);

export default Settings;
