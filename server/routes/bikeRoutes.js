const express = require('express');
const bikeController = require('../controllers/bikeController');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

const isOwner = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Only owners can perform this action.' });
  }
};

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `bike-doc-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });



router.get('/', auth, bikeController.listBikes);

router.post('/', auth, isOwner, bikeController.addBike);

router.delete('/:id', auth, isOwner, bikeController.deleteBike);

router.post('/rent', auth, bikeController.rentBike);
router.post('/return', auth, bikeController.returnBike);

router.post('/verify-ownership', auth, upload.single('document'), bikeController.verifyOwnership);

module.exports = router;