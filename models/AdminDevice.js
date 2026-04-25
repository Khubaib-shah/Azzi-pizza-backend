import mongoose from "mongoose";

const adminDeviceSchema = new mongoose.Schema(
  {
    fcmToken: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const AdminDevice = mongoose.model("AdminDevice", adminDeviceSchema);
export default AdminDevice;
