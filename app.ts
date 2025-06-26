import express from "express";
import type { Express } from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import passport from "./src/config/passport";
import authRoutes from "./src/routes/auth";
import adminAuthRoutes from "./src/routes/adminAuth";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler";

dotenv.config();

const app: Express = express();
const server = new Server();

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

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

server.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const httpServer = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.attach(httpServer);
