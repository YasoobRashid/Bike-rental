const Redis = require("ioredis");

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
};

const publisher = new Redis(redisConfig);
const subscriber = new Redis(redisConfig);

publisher.on("connect", () => console.log("Redis Publisher Connected"));
subscriber.on("connect", () => console.log("Redis Subscriber Connected"));

module.exports = { publisher, subscriber };