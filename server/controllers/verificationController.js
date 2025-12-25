const User = require('../models/User');
const Tesseract = require('tesseract.js');
const messageQueue = require('../utils/queue'); 
const path = require('path');
const fs = require('fs');

async function uploadLicense(req, res) {
  try {
    if (req.user.role !== 'renter') {
      if (req.file) require('fs').unlinkSync(req.file.path);
      
      return res.status(403).json({ 
        error: 'Access denied. Only renters need to verify a driver\'s license.' 
      });
    }

    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const imagePath = req.file.path;

    console.log(`Scanning license for user: ${user.username}...`);
    
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
    
    console.log("Extracted Text:", text); 

    const scannedText = text.toLowerCase();
    const username = user.username.toLowerCase();

    const isMatch = scannedText.includes(username);

    user.licenseImage = req.file.filename;
    
    if (isMatch) {
      user.verificationStatus = 'verified';
      user.isVerified = true;
    } else {
      user.verificationStatus = 'pending'; 
      user.isVerified = false;
    }

    await user.save();

    if (user.isVerified) {
        await messageQueue.add({
            type: 'send_email', 
            payload: {
                to: user.email,
                subject: 'Identity Verified - Bike Rental App',
                text: `Hi ${user.username}, your driver's license has been verified! You can now rent bikes.`
            }
        });
        console.log(`[Queue] Verification success email queued for ${user.email}`);
    } 
    else if (user.verificationStatus === 'pending') {
        await messageQueue.add({
            type: 'send_email',
            payload: {
                to: user.email,
                subject: 'Verification Pending',
                text: `Hi ${user.username}, we could not auto-verify your ID. An admin will review it shortly.`
            }
        });
        console.log(`[Queue] Pending notification queued for ${user.email}`);
    }

    if (user.isVerified) {
      return res.json({ 
        message: 'Identity Verified Successfully!', 
        status: 'verified',
        extractedText: text 
      });
    } else {
      return res.status(200).json({ 
        message: 'Could not auto-verify name. Marked for manual review.', 
        status: 'pending' 
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed during processing' });
  }
}

module.exports = { uploadLicense };