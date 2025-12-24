const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Import bcryptjs
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

async function signup(req, res, next) {
  try {
    const { username, email, password, role } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ 
      username, 
      email, 
      password: hashedPassword, 
      role 
    });

    return res.status(201).json({
      message: 'Signup successful',
      userId: user._id, 
      username: user.username,
      role: user.role
    });

  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      userId: user._id,
      username: user.username,
      role: user.role
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login };