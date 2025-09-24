const Bike = require('../../models/Bike');

async function listBikes(req, res, next) {
  try {
    const user = req.user; 

    if (user && user.role === 'owner') {
      const bikes = await Bike.find({ owner: user.id }).lean();
      return res.json({ bikes }); 
    }
    
    if (user && user.role === 'renter') {
      const availableBikes = await Bike.find({ available: true }).lean();
      const rentedByMe = await Bike.find({ rentedBy: user.id }).lean();
      return res.json({ availableBikes, rentedByMe });
    }

    const availableBikes = await Bike.find({ available: true }).lean();
    res.json({ availableBikes, rentedByMe: [] }); 

  } catch (err) {
    next(err);
  }
}

// Add a new bike (owner only)
async function addBike(req, res, next) {
  try {
    const { name, pricePerHour } = req.body;
    if (!name || !pricePerHour) {
      return res.status(400).json({ error: 'Name and pricePerHour are required' });
    }

    const bike = await Bike.create({
      name,
      pricePerHour,
      owner: req.user.id
    });

    res.status(201).json({ message: 'Bike added successfully', bike });
  } catch (err) {
    next(err);
  }
}

// Delete a bike (owner only)
async function deleteBike(req, res, next) {
  try {
    const bikeId = req.params.id;
    const bike = await Bike.findById(bikeId);

    if (!bike) {
      return res.status(404).json({ error: 'Bike not found' });
    }

    if (bike.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete this bike' });
    }

    if (!bike.available) {
      return res.status(400).json({ error: 'Cannot delete a bike that is currently rented' });
    }

    await Bike.findByIdAndDelete(bikeId);
    res.json({ message: 'Bike deleted successfully' });

  } catch (err) {
    next(err);
  }
}


// POST /api/bikes/rent  (auth required)
async function rentBike(req, res, next) {
  try {
    const { bikeId } = req.body || {};
    if (!bikeId) return res.status(400).json({ error: 'bikeId is required' });

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    if (!bike.available) return res.status(400).json({ error: 'Bike is already rented' });

    bike.available = false;
    bike.rentedBy = req.user.id; 
    await bike.save();

    res.json({
      message: 'Bike rented successfully',
      bike: { id: bike._id, name: bike.name, pricePerHour: bike.pricePerHour, available: bike.available }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/bikes/return  (auth required)
async function returnBike(req, res, next) {
  try {
    const { bikeId } = req.body || {};
    if (!bikeId) return res.status(400).json({ error: 'bikeId is required' });

    const bike = await Bike.findById(bikeId);
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    if (bike.available) return res.status(400).json({ error: 'Bike is not currently rented' });

    if (!bike.rentedBy || bike.rentedBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You did not rent this bike' });
    }

    bike.available = true;
    bike.rentedBy = null;
    await bike.save();

    res.json({
      message: 'Bike returned successfully',
      bike: { id: bike._id, name: bike.name, pricePerHour: bike.pricePerHour, available: bike.available }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBikes,
  addBike,
  deleteBike,
  rentBike,
  returnBike
};