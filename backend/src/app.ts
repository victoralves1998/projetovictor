import express from "express";
import cors from "cors";
import { config } from "./config";
import { botsRoutes } from "./routes/bots.routes";

const app = express();

app.use(express.json({ limit: "2mb" }));

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true
  })
);

app.get("/", (_req, res) => {
  res.json({ name: "FluxZap API", version: "1.0.0", status: "ok" });
});

app.use("/api/bots", botsRoutes);

export default app;
