import express from "express";
import type { Express } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import passport from "./src/config/passport";
import authRoutes from "./src/routes/auth";
import adminAuthRoutes from "./src/routes/adminAuth";
import superadminModuleRoutes from "./src/routes/superadminModule";
import adminModuleRoutes from "./src/routes/adminModule";
import rentalRoutes from "./src/routes/rental";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler";
import { websocketService } from "./src/services/websocketService";

dotenv.config();

const app: Express = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Initialize Passport
app.use(passport.initialize());

// Routes
app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

// Authentication routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminAuthRoutes);
app.use("/api/v1/superadmin", superadminModuleRoutes);
app.use("/api/v1/admin", adminModuleRoutes);
app.use("/api/v1", rentalRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

const httpServer = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Initialize WebSocket service
websocketService.initialize(httpServer);

console.log("WebSocket server is available at ws://localhost:3000/ws");
