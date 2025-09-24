const express = require('express');
const bikeController = require('../controllers/bikeController');
const auth = require('../middleware/auth');

const router = express.Router();

const isOwner = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Only owners can perform this action.' });
  }
};

router.get('/', auth, bikeController.listBikes);

router.post('/', auth, isOwner, bikeController.addBike);

router.delete('/:id', auth, isOwner, bikeController.deleteBike);

router.post('/rent', auth, bikeController.rentBike);
router.post('/return', auth, bikeController.returnBike);

module.exports = router;