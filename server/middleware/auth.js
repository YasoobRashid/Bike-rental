const jwt = require('jsonwebtoken');
const JWT_SECRET = 'supersecret';

module.exports = function (req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; 
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
