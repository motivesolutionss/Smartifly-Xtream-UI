// src/server.ts
import "dotenv/config";
import http from "http";

import { createApp } from "./app";
import { setupSwagger } from "./config/swagger";
import { initSocket } from "./socket";
import { assertProviderHealthSchemaReady } from "./startup/providerHealthSchemaCheck";
// import { processCSVTasks } from "./workers/csvWorker";


const PORT = process.env.PORT || 4000;

async function bootstrap(): Promise<void> {
  await assertProviderHealthSchemaReady();

  const app = createApp();

  // ---------------------------
  // 🌐 Swagger / OpenAPI Setup
  // ---------------------------
  setupSwagger(app); // <-- NEW

  // ---------------------------
  // HTTP + Socket.io Integration
  // ---------------------------
  const server = http.createServer(app);

  // Socket.io
  const io = initSocket(server);

  // ---------------------------
  // 🛠 Background CSV Task Worker (Disabled)
  // ---------------------------
  // processCSVTasks(); // <-- NEW

  // ---------------------------
  // 🚀 Start HTTP Server
  // ---------------------------
  server.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`✅ Godfather backend running on: http://localhost:${PORT}`);
    console.log(`📘 Swagger Docs available at:  http://localhost:${PORT}/docs`);
    console.log(`💬 Socket.io live on: ws://localhost:${PORT}`);
    console.log(`📦 CSV Worker is running every 5 seconds`);
    console.log(`===========================================`);
  });

  // -------------------------------------------------
  // 🧹 Graceful Shutdown (Docker / PM2 / cPanel safe)
  // -------------------------------------------------
  const shutdown = () => {
    console.log("🔻 Received shutdown signal, cleaning up...");

    // Close WebSocket server
    io.close(() => console.log("💬 Socket server closed."));

    // Close HTTP server
    server.close(() => {
      console.log("🛑 HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// ---------------------------
// Bootstrap App
// ---------------------------
bootstrap().catch((err) => {
  console.error("❌ Failed to bootstrap server:", err);
  process.exit(1);
});
