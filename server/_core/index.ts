import "dotenv/config";
import express from "express";
import fs from "node:fs";
import { createServer } from "http";
import net from "net";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startNewsScheduler } from "../newsService";
import { startIdeafarmScheduler } from "../ideafarmService";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Inlined so production never touches ./vite.ts (which transitively imports
// the `vite` package, a devDependency not present in the prod container).
function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Liveness probe — plain 200 with no deps, used by Railway healthcheck.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  // Google OAuth routes under /api/auth/google and /api/auth/google/callback
  registerAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files.
  // setupVite is imported dynamically so the vite package (devDependency)
  // is never loaded in production.
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const HOST = "0.0.0.0";
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;

  // On Railway/Fly/etc. the platform injects PORT and routes traffic to that
  // exact port. Any "find an available port" fallback silently binds to a
  // different port that the platform proxy never reaches, so we only do the
  // probe dance in local dev.
  let port: number;
  if (Number.isFinite(envPort)) {
    port = envPort;
  } else {
    port = await findAvailablePort(3000);
  }

  server.listen(port, HOST, () => {
    console.log(`Server running on http://${HOST}:${port}/`);
    // Start news scraping scheduler
    startNewsScheduler();
    // Start ideafarm research/podcasts scraping scheduler
    startIdeafarmScheduler();
  });
}

startServer().catch(console.error);
