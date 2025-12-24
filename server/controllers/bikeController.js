const Bike = require('../models/Bike');
const redis = require('../utils/redis');
const { publisher } = require("../utils/pubsub");

const CACHE_AVAILABLE_BIKES = "available_bikes";

// GET Bikes (Role-based)
async function listBikes(req, res, next) {
  try {
    const user = req.user;

    if (user && user.role === 'owner') {
      const bikes = await Bike.find({ owner: user.id }).lean();
      return res.json({ bikes });
    }

    if (user && user.role === 'renter') {
      const cachedBikes = await redis.get(CACHE_AVAILABLE_BIKES);
      let availableBikes;

      if (cachedBikes) {
        console.log("Cache Hit (Renter)");
        availableBikes = JSON.parse(cachedBikes);
      } else {
        console.log("Cache Miss, Fetching DB");
        availableBikes = await Bike.find({ available: true }).lean();
        await redis.set(CACHE_AVAILABLE_BIKES, JSON.stringify(availableBikes), "EX", 60);
      }

      const rentedByMe = await Bike.find({ rentedBy: user.id }).lean();
      return res.json({ availableBikes, rentedByMe });
    }

    const cached = await redis.get(CACHE_AVAILABLE_BIKES);
    let availableBikes = cached ? JSON.parse(cached)
      : await Bike.find({ available: true }).lean();

    return res.json({ availableBikes, rentedByMe: [] });

  } catch (err) {
    next(err);
  }
}

async function verifyOwnership(req, res, next) {
  try {
    const { bikeId } = req.body;
    
    if (!req.file) return res.status(400).json({ error: 'Document image required' });
    if (!bikeId) return res.status(400).json({ error: 'Bike ID required' });

    const bike = await Bike.findOne({ _id: bikeId, owner: req.user.id });
    if (!bike) return res.status(404).json({ error: 'Bike not found or unauthorized' });

    const owner = await User.findById(req.user.id);
    const targetName = owner.username.toUpperCase();

    console.log(`[VerifyBike] Scanning document for Bike: ${bike.name}`);
    console.log(`[VerifyBike] Looking for Owner Name: ${targetName}`);

    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
    const cleanText = text.toUpperCase();
    
    console.log("Extracted Text:", cleanText.substring(0, 100) + "...");

    let isMatch = false;

    if (cleanText.includes(targetName)) {
        isMatch = true;
    } else {
        const partialName = targetName.split(" ")[0]; 
        if (cleanText.includes(partialName) && (cleanText.includes("RECEIPT") || cleanText.includes("REGISTRATION") || cleanText.includes("INSURANCE"))) {
            console.log("Partial Match: Found First Name + Document Keyword");
            isMatch = true;
        }
    }

    bike.ownershipDocument = req.file.filename;

    if (isMatch) {
        bike.isVerified = true;
        bike.verificationStatus = 'verified';
        bike.available = true; // BIKE GOES LIVE
        
        await bike.save();
        
        await redis.del(CACHE_AVAILABLE_BIKES);
        publisher.publish("bike_events", JSON.stringify({
            action: "added",
            bikeId: bike._id,
            message: `New Verified Bike Listed: ${bike.name}`,
            timestamp: Date.now()
        }));
    } else {
        bike.isVerified = false;
        bike.verificationStatus = 'pending'; 
        bike.available = false; 
        await bike.save();
    }

    if (bike.isVerified) {
        await messageQueue.add({
            type: 'send_email',
            payload: {
                to: owner.email,
                subject: 'Bike Listing Verified! 🚲',
                text: `Congratulations ${owner.username}! Your document for "${bike.name}" has been verified. The bike is now live.`
            }
        });
        console.log(`[Queue] Bike verified email queued for ${owner.email}`);
    } else {
        await messageQueue.add({
            type: 'send_email',
            payload: {
                to: owner.email,
                subject: 'Bike Document Under Review',
                text: `Hi ${owner.username}, we received your document for "${bike.name}" but couldn't verify it automatically. Our team will review it manually.`
            }
        });
        console.log(`[Queue] Bike pending email queued for ${owner.email}`);
    }

    if (isMatch) {
        return res.json({ 
            status: 'verified', 
            message: 'Ownership Verified! Your bike is now visible to renters.' 
        });
    } else {
        return res.json({ 
            status: 'pending', 
            message: 'Could not auto-verify. Sent for Admin Review.',
            tip: 'Ensure the document clearly shows your registered username.'
        });
    }

  } catch (err) {
    next(err);
  }
}

// Add a new bike
async function addBike(req, res, next) {
  try {
    const { name, pricePerHour, bikeNumber } = req.body;

    if (!name || !pricePerHour || !bikeNumber) {
      return res.status(400).json({ error: 'Name, pricePerHour, and bikeNumber are required' });
    }

    const existing = await Bike.findOne({ bikeNumber });
    if (existing) {
      return res.status(409).json({ error: `Bike with number ${bikeNumber} already exists.` });
    }

    const bike = await Bike.create({
      name,
      pricePerHour,
      bikeNumber, 
      owner: req.user.id,
      available: false, 
      isVerified: false,
      verificationStatus: 'unverified'
    });

    res.status(201).json({ 
      message: 'Bike listed! Please verify ownership to make it public.', 
      bike 
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Bike number must be unique.' });
    }
    next(err);
  }
}


// Delete bike
async function deleteBike(req, res, next) {
  try {
    const bikeId = req.params.id;
    const bike = await Bike.findById(bikeId);

    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    if (bike.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!bike.available) {
      return res.status(400).json({ error: 'Cannot delete: bike is rented' });
    }
    
    await redis.del(CACHE_AVAILABLE_BIKES);
    await Bike.findByIdAndDelete(bikeId);

    publisher.publish("bike_events", JSON.stringify({
      action: "deleted",
      bikeId,
      ownerId: req.user.id,
      message: `Bike "${bike.name}" was removed.`,
      timestamp: Date.now()
    }));

    res.json({ message: 'Bike deleted successfully' });

  } catch (err) {
    next(err);
  }
}


// Rent bike
async function rentBike(req, res, next) {
  try {
    const { bikeId } = req.body;
    if (!bikeId) return res.status(400).json({ error: 'bikeId required' });

    const bike = await Bike.findOneAndUpdate(
      { _id: bikeId, available: true }, 
      { 
        $set: { 
          available: false, 
          rentedBy: req.user.id 
        } 
      },
      { new: true } 
    );


    if (!bike) {
      return res.status(400).json({ error: 'Bike not found or already rented' });
    }


    await redis.del(CACHE_AVAILABLE_BIKES);


    publisher.publish("bike_events", JSON.stringify({
      action: "rented",
      bikeId,
      renterId: req.user.id,
      message: `Bike "${bike.name}" has been rented.`,
      timestamp: Date.now()
    }));

    res.json({ message: 'Bike rented successfully', bike });

  } catch (err) {
    next(err);
  }
}


// Return bike
async function returnBike(req, res, next) {
  try {

    const user = await User.findById(req.user.id);
    if (!user.isVerified) {
      return res.status(403).json({ 
        error: 'Identity not verified', 
        verificationStatus: user.verificationStatus 
      });
    }

    const { bikeId } = req.body;
    if (!bikeId) return res.status(400).json({ error: 'bikeId required' });

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ error: 'Bike not found' });

    if (bike.available) {
      return res.status(400).json({ error: 'Bike is not currently rented' });
    }

    if (!bike.rentedBy || bike.rentedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You did not rent this bike' });
    }

    bike.available = true;
    bike.rentedBy = null;
    await bike.save();

    await redis.del(CACHE_AVAILABLE_BIKES);

    publisher.publish("bike_events", JSON.stringify({
      action: "returned",
      bikeId,
      userId: req.user.id,
      message: `Bike "${bike.name}" has been returned.`,
      timestamp: Date.now()
    }));

    res.json({ message: 'Bike returned successfully', bike });

  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBikes,
  addBike,
  deleteBike,
  rentBike,
  returnBike,
  verifyOwnership
};
