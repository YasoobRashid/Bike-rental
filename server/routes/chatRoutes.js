const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const auth = require("../middleware/auth"); 

router.get("/:bikeId", auth, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ bikeId: req.params.bikeId })
      .sort({ createdAt: 1 }); 

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

router.get('/history/:bikeId', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    
    const messages = await ChatMessage.find({ bikeId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

module.exports = router;
