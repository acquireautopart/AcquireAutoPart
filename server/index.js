require("dotenv").config();

const mongoose = require("mongoose");
const { loadEnvironment } = require("./src/config/environment");
const { createApp } = require("./src/app");

async function startServer() {
  const config = loadEnvironment();
  const app = createApp(config);

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exitCode = 1;
    return;
  }

  const server = app.listen(config.port, () => {
    console.log(`Customer API listening on port ${config.port}`);
  });

  async function shutdown(signal) {
    console.log(`${signal} received; closing customer API.`);
    server.close(async (error) => {
      if (error) {
        console.error("Failed to close customer API:", error);
        process.exitCode = 1;
      }
      await mongoose.disconnect();
    });
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Customer API failed to start:", error.message);
  process.exitCode = 1;
});
