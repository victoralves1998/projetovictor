import { Router } from "express";
import { baileysService } from "../services/baileys.service";

export const botsRoutes = Router();

// MVP (1 instância). Preparado p/ multi instância depois.
const instanceId = "default";

botsRoutes.get("/status", (_req, res) => {
  res.json(baileysService.getStatus(instanceId));
});

botsRoutes.post("/connect", async (_req, res) => {
  res.json(await baileysService.connect(instanceId));
});

botsRoutes.post("/disconnect", async (_req, res) => {
  res.json(await baileysService.disconnect(instanceId));
});

botsRoutes.get("/qr", (_req, res) => {
  res.json(baileysService.getQr(instanceId));
});

botsRoutes.post("/reset", async (_req, res) => {
  res.json(await baileysService.reset(instanceId));
});
