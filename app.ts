import express from "express";
import type { Express } from "express";
import { Server } from "socket.io";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

const app: Express = express();
const server = new Server();

app.get("/", (_req, res) => {
  res.send("Hello, World!");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

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
