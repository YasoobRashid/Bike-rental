const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const bikeRoutes = require('./routes/bikeRoutes');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://127.0.0.1:27017/bikerental';



app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/bikes', bikeRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err.message));

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

