import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3001),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  dataDir: process.env.DATA_DIR?.trim()
    ? path.resolve(process.env.DATA_DIR.trim())
    : path.resolve(process.cwd()),
  defaultInstanceId: "default"
};

export function pathsForInstance(instanceId: string) {
  const safeId = instanceId || config.defaultInstanceId;
  const authDir = path.join(config.dataDir, "auth_info", safeId);
  const dataDir = path.join(config.dataDir, "data");
  const qrPath = path.join(dataDir, `qr_${safeId}.txt`); // debug
  return { safeId, authDir, dataDir, qrPath };
}
