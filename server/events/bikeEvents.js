const { subscriber } = require("../utils/pubsub");
const messageQueue = require("../utils/queue");

subscriber.subscribe("bike_events", () => {
  console.log("[BikeEvents] Listening for bike_events to queue jobs...");
});

subscriber.on("message", async (_, rawMessage) => {
  try {
    const data = JSON.parse(rawMessage);

    console.log(`[BikeEvents] Event received: ${data.action}`);

    await messageQueue.add({
      type: "notification", 
      payload: data,
      timestamp: Date.now()
    });

    console.log(`[BikeEvents] Background job enqueued for action: ${data.action}`);

  } catch (err) {
    console.error("[BikeEvents] Error processing message:", err);
  }
});