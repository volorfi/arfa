import "dotenv/config";
import express from "express";
import fs from "node:fs";
import { createServer } from "http";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { startNewsScheduler } from "../newsService";
import { startIdeafarmScheduler } from "../ideafarmService";

// Inlined so production never touches ./vite.ts (which transitively imports
// the `vite` package, a devDependency not present in the prod container).
function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  // Bypass all caches for brand assets so logo changes propagate immediately
  // when the deploy succeeds. Cheap to re-fetch; worth it for debugging.
  app.use("/brand", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    next();
  });
  app.use("/favicon.jpg", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    next();
  });
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Build-time git SHA: Railway exposes RAILWAY_GIT_COMMIT_SHA at runtime.
// Render it at /version so we can prove which commit is live without guessing.
const COMMIT_SHA =
  process.env.RAILWAY_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT_SHA ??
  "unknown";
const DEPLOY_ID = process.env.RAILWAY_DEPLOYMENT_ID ?? "unknown";

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
  // Diagnostic — which commit is actually running? Cache-busted.
  app.get("/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.status(200).json({
      commit: COMMIT_SHA,
      commitShort: COMMIT_SHA.slice(0, 7),
      deployId: DEPLOY_ID,
      bootedAt: new Date().toISOString(),
    });
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

  // Bind verbatim to whatever the platform (Railway, Fly, etc.) injects via
  // PORT; default to 3000 for local dev. Any fallback that picks a different
  // port silently breaks platform healthchecks that only route to $PORT.
  const HOST = "0.0.0.0";
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  server.listen(port, HOST, () => {
    console.log(
      `Server running on http://${HOST}:${port}/ (NODE_ENV=${process.env.NODE_ENV ?? "development"})`
    );
    startNewsScheduler();
    startIdeafarmScheduler();
  });
}

startServer().catch(console.error);
