import { Router } from "express";
import { botsRoutes } from "./bots.routes";

export const apiRoutes = Router();

apiRoutes.get("/health", (_req, res) => {
  res.json({ ok: true, name: "FluxZap API", version: "1.0.0" });
});

apiRoutes.use("/bots", botsRoutes);
