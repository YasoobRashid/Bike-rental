const express = require('express');
const { signup, login } = require('../controllers/authController');
const { uploadLicense } = require('../controllers/verificationController'); 
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });



router.post('/signup', signup);
router.post('/login', login);

router.post('/verify-license', auth, upload.single('license'), uploadLicense);

module.exports = router;