import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import onboardingRoutes from "./routes/onboarding";
import portalRoutes from "./routes/portal";
import adminRoutes from "./routes/admin";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Parse cookies for auth tokens
  app.use(cookieParser());

  // Parse JSON bodies
  app.use((await import("express")).json());

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/onboarding", onboardingRoutes);
  app.use("/api/portal", portalRoutes);
  app.use("/api/admin", adminRoutes);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
