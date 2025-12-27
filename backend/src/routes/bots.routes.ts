import { Router } from "express";
import { baileysService } from "../services/baileys.service";

export const botsRoutes = Router();

botsRoutes.get("/status", (_req, res) => {
  res.json(baileysService.getStatus());
});

botsRoutes.post("/connect", async (req, res) => {
  const instanceId = (req.body?.instanceId as string) || "default";
  const st = await baileysService.connect(instanceId);
  res.json(st);
});

botsRoutes.post("/disconnect", async (_req, res) => {
  const st = await baileysService.disconnect();
  res.json(st);
});

botsRoutes.post("/reset", async (req, res) => {
  const instanceId = (req.body?.instanceId as string) || "default";
  const st = await baileysService.reset(instanceId);
  res.json(st);
});

botsRoutes.get("/qr", (_req, res) => {
  res.json({ instanceId: "default", qr: baileysService.getQr() });
});

/**
 * Ensure: se não está conectado, tenta conectar e gerar QR automaticamente.
 * Não dá reset aqui. Só "garante" que tem tentativa em andamento.
 */
botsRoutes.post("/ensure", async (req, res) => {
  const instanceId = (req.body?.instanceId as string) || "default";
  const st = baileysService.getStatus();

  if (st.connected) return res.json(st);

  // se não tem QR, tenta conectar (vai gerar QR)
  if (!baileysService.getQr()) {
    const next = await baileysService.connect(instanceId);
    return res.json(next);
  }

  return res.json(st);
});

/**
 * Refresh QR: se ainda não conectou, força reset pra emitir QR novo.
 * Usar com timer no front.
 */
botsRoutes.post("/refresh-qr", async (req, res) => {
  const instanceId = (req.body?.instanceId as string) || "default";
  const st = baileysService.getStatus();

  if (st.connected) return res.json(st);

  // força reset para garantir QR novo
  const next = await baileysService.reset(instanceId);
  return res.json(next);
});
