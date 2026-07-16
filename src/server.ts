import { Server } from "http";
import app from "./app";
import config from "./config";
import { prisma } from "./lib/prisma";

let server: Server;

async function main() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log("Database connected successfully 🔌");

    server = app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port} 🚀`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

// Handle graceful shutdown and errors
process.on("unhandledRejection", (err) => {
  console.log("Unhandled Rejection detected! Shutting down...");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception detected! Shutting down...");
  process.exit(1);
});