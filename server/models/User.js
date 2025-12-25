const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, minlength: 2, maxlength: 50 },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 3, maxlength: 100 },
    role: {
      type: String,
      enum: ['owner', 'renter'], 
      default: 'renter' 
    },
    licenseImage: { type: String, default: null }, 
    isVerified:   { type: Boolean, default: false }, 
    verificationStatus: { 
      type: String, 
      enum: ['unverified', 'pending', 'verified', 'rejected'], 
      default: 'unverified' 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);