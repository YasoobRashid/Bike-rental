require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const cors = require("cors");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bikerental";

const ChatMessage = require("./models/ChatMessage");
const { subscriber } = require("./utils/pubsub");

require('./events/bikeEvents');
require("./workers/messageQueueWorker");

const app = express();
const server = http.createServer(app);

app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 


app.use((req, res, next) => {
  if (!req.body) req.body = {};
  next();
});

const { WebSocketServer } = require("ws");
const wss = new WebSocketServer({ server });

console.log("WebSocket server initialized.");

const rooms = {}; 

function joinRoom(socket, bikeId) {
  if (!rooms[bikeId]) rooms[bikeId] = new Set();
  rooms[bikeId].add(socket);

  socket.roomId = bikeId;
  console.log(`User joined room: ${bikeId}`);
}

function broadcastToRoom(roomId, data) {
  if (!rooms[roomId]) return;
  rooms[roomId].forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data);

      if (parsed.type === "join_chat") {
        joinRoom(socket, parsed.bikeId);
        return;
      }

      if (parsed.type === "chat") {
        const savedMessage = await ChatMessage.create({
          bikeId: parsed.bikeId,
          sender: parsed.sender,
          receiver: parsed.receiver,
          message: parsed.message,
          system: false
        });

        await savedMessage.populate('sender', 'username');

        broadcastToRoom(parsed.bikeId, savedMessage);
      }
    } catch (err) {
      console.log("WebSocket message error:", err);
    }
  });

  socket.on("close", () => {
    console.log("User disconnected");
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].delete(socket);
    }
  });
});

subscriber.subscribe("bike_events", () => {
  console.log("Listening for Redis bike_events...");
});

subscriber.on("message", async (_, msg) => {
  const event = JSON.parse(msg);

  const sysMsg = await ChatMessage.create({
    bikeId: event.bikeId,
    sender: null,
    receiver: null,
    message: event.message,
    system: true
  });

  console.log("System auto-message sent: ", event.message);
  broadcastToRoom(event.bikeId, sysMsg);
});


const authRoutes = require("./routes/authRoutes");
const bikeRoutes = require("./routes/bikeRoutes");
const chatRoutes = require("./routes/chatRoutes");

app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/auth", authRoutes);
app.use("/api/bikes", bikeRoutes);
app.use("/api/chat", chatRoutes);

app.use("/api", (_, res) => res.status(404).json({ error: "API route not found" }));

mongoose.connect(MONGO_URI)
  .then(() => console.log(`MongoDB Connected: ${MONGO_URI}`))
  .catch((err) => console.error("MongoDB Error:", err));

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("WebSocket Ready (ws)");
});
