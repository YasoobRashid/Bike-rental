const Queue = require("bull");

const messageQueue = new Queue("bikeNotifications", {
  redis: { 
    host: process.env.REDIS_HOST || "127.0.0.1", 
    port: process.env.REDIS_PORT || 6379 
  }
});

messageQueue.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

messageQueue.on("failed", (job, err) => {
  console.log(`Job failed ${job.id}:`, err.message);
});

module.exports = messageQueue;
