const mongoose = require('mongoose');

const BikeSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    available:    { type: Boolean, default: true },
    bikeNumber:   { type: String, required: true, unique: true, trim: true },
    pricePerHour: { type: Number, required: true, min: 0 },
    isVerified:   { type: Boolean, default: false },
    verificationStatus: { 
      type: String, 
      enum: ['unverified', 'pending', 'verified', 'rejected'], 
      default: 'unverified' 
    },
    ownershipDocument: { type: String, default: null },
    rentedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bike', BikeSchema);