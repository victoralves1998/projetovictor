import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket
} from "@whiskeysockets/baileys";
import fs from "fs";
import { pathsForInstance } from "../config";
import { ensureDir, removeDirRecursive } from "../utils/fs.utils";
import { logService } from "./log.service";
import { wsService } from "./ws.service";
import { storeService } from "./store.service";

type InstanceRuntime = {
  instanceId: string;
  sock: WASocket | null;
  qr: string | null;
  status: "disconnected" | "connecting" | "connected";
};

class BaileysService {
  private instances = new Map<string, InstanceRuntime>();

  private getRuntime(instanceId: string): InstanceRuntime {
    const safeId = pathsForInstance(instanceId).safeId;
    if (!this.instances.has(safeId)) {
      this.instances.set(safeId, {
        instanceId: safeId,
        sock: null,
        qr: null,
        status: "disconnected"
      });
    }
    return this.instances.get(safeId)!;
  }

  getStatus(instanceId: string) {
    const rt = this.getRuntime(instanceId);
    const persisted = storeService.getBotState(rt.instanceId);
    return {
      instanceId: rt.instanceId,
      status: rt.status,
      connected: rt.status === "connected",
      hasQr: Boolean(rt.qr),
      persisted
    };
  }

  getQr(instanceId: string) {
    const rt = this.getRuntime(instanceId);
    return { instanceId: rt.instanceId, qr: rt.qr };
  }

  async connect(instanceId: string) {
    const rt = this.getRuntime(instanceId);
    const { authDir, dataDir, qrPath } = pathsForInstance(rt.instanceId);

    ensureDir(authDir);
    ensureDir(dataDir);

    if (rt.status === "connected" || rt.status === "connecting") {
      return this.getStatus(rt.instanceId);
    }

    rt.status = "connecting";
    rt.qr = null;

    wsService.broadcastLog(logService.push("info", `[${rt.instanceId}] Connecting...`));

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false
    });

    rt.sock = sock;

    sock.ev.on("creds.update", async () => {
      await saveCreds();
    });

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        rt.qr = qr;
        fs.writeFileSync(qrPath, qr, "utf-8"); // debug
        storeService.setBotState(rt.instanceId, { lastQrAt: new Date().toISOString() });

        wsService.broadcastLog(logService.push("info", `[${rt.instanceId}] New QR generated.`));
        wsService.broadcastStatus(this.getStatus(rt.instanceId));
      }

      if (connection === "open") {
        rt.status = "connected";
        rt.qr = null;

        storeService.setBotState(rt.instanceId, {
          connected: true,
          lastConnectionUpdate: new Date().toISOString()
        });

        wsService.broadcastLog(logService.push("info", `[${rt.instanceId}] Connected ✅`));
        wsService.broadcastStatus(this.getStatus(rt.instanceId));
      }

      if (connection === "close") {
        rt.status = "disconnected";

        storeService.setBotState(rt.instanceId, {
          connected: false,
          lastConnectionUpdate: new Date().toISOString()
        });

        const code =
          (lastDisconnect?.error as any)?.output?.statusCode ||
          (lastDisconnect?.error as any)?.output?.payload?.statusCode;

        const reason =
          code === DisconnectReason.loggedOut ? "loggedOut" : code ? `code:${code}` : "unknown";

        wsService.broadcastLog(logService.push("warn", `[${rt.instanceId}] Disconnected (${reason}).`));
        wsService.broadcastStatus(this.getStatus(rt.instanceId));

        rt.sock = null;
      }
    });

    return this.getStatus(rt.instanceId);
  }

  async disconnect(instanceId: string) {
    const rt = this.getRuntime(instanceId);

    if (rt.sock) {
      try {
        await rt.sock.logout();
      } catch {}
      try {
        rt.sock.end(undefined);
      } catch {}
    }

    rt.sock = null;
    rt.qr = null;
    rt.status = "disconnected";

    storeService.setBotState(rt.instanceId, {
      connected: false,
      lastConnectionUpdate: new Date().toISOString()
    });

    wsService.broadcastLog(logService.push("info", `[${rt.instanceId}] Disconnected by API.`));
    wsService.broadcastStatus(this.getStatus(rt.instanceId));

    return this.getStatus(rt.instanceId);
  }

  async reset(instanceId: string) {
    const rt = this.getRuntime(instanceId);
    const { authDir } = pathsForInstance(rt.instanceId);

    // 1) desconecta
    await this.disconnect(rt.instanceId);

    // 2) apaga auth_info COMPLETAMENTE
    removeDirRecursive(authDir);
    ensureDir(authDir);

    // 3) força novo QR conectando novamente
    rt.qr = null;
    wsService.broadcastLog(logService.push("info", `[${rt.instanceId}] Reset done. Generating new QR...`));

    return await this.connect(rt.instanceId);
  }
}

export const baileysService = new BaileysService();
