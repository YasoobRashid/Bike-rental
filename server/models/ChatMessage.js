const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: "Bike", required: true },

  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },

  message: { type: String, required: true },

  system: { type: Boolean, default: false },  
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatSchema);
