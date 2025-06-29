import express from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import https from "https";
import fs from "fs";
import passport from "./src/config/passport";
import authRoutes from "./src/routes/auth";
import adminAuthRoutes from "./src/routes/adminAuth";
import superadminModuleRoutes from "./src/routes/superadminModule";
import adminModuleRoutes from "./src/routes/adminModule";
import userModuleRoutes from "./src/routes/userModule";
import rentalRoutes from "./src/routes/rental";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler";
import { websocketService } from "./src/services/websocketService";

dotenv.config();

const app: Express = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.static(path.join(__dirname, "public")));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminAuthRoutes);
app.use("/api/v1/superadmin", superadminModuleRoutes);
app.use("/api/v1/admin", adminModuleRoutes); // This mounts admin module routes at /api/v1/admin
app.use("/api/v1", userModuleRoutes); // This mounts user module routes at /api/v1
app.use("/api/v1", rentalRoutes);

// Debug route to list all routes
app.get("/debug/routes", (req, res) => {
  const routes: any[] = [];

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      const routerPath = middleware.regexp.source
        .replace("\\/?(?=\\/|$)", "")
        .replace("^", "");
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          routes.push({
            path: routerPath + handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json(routes);
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

let httpServer;

// Check if SSL certificates exist for HTTPS
const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

if (
  sslKeyPath &&
  sslCertPath &&
  fs.existsSync(sslKeyPath) &&
  fs.existsSync(sslCertPath)
) {
  // Create HTTPS server
  const httpsOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
  };

  httpServer = https.createServer(httpsOptions, app);
  httpServer.listen(PORT, () => {
    console.log(`HTTPS Server is running on port ${PORT}`);
  });
} else {
  // Create HTTP server
  httpServer = app.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
  });
}

// Initialize WebSocket service
websocketService.initialize(httpServer);

const protocol = sslKeyPath && sslCertPath ? "wss" : "ws";
console.log(
  `WebSocket server is available at ${protocol}://localhost:${PORT}/ws`
);
