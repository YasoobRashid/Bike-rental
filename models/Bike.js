const mongoose = require('mongoose');

const BikeSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    available:    { type: Boolean, default: true },
    pricePerHour: { type: Number, required: true, min: 0 },
    rentedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bike', BikeSchema);