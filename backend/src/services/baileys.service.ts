import path from "path";
import fs from "fs";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket
} from "@whiskeysockets/baileys";
import pino from "pino";
import { config } from "../config";
import { log } from "./log.service";
import { wsService } from "./ws.service";

type BotStatus = {
  instanceId: string;
  status: "disconnected" | "connecting" | "connected";
  connected: boolean;
  hasQr: boolean;
  note?: string;
};

class BaileysService {
  private sock: WASocket | null = null;
  private instanceId = "default";
  private status: BotStatus = {
    instanceId: "default",
    status: "disconnected",
    connected: false,
    hasQr: false
  };

  private currentQr: string | null = null;
  private connecting = false;
  private manualDisconnect = false;

  // anti-loop: se cair 515 muitas vezes, provavelmente rede/firewall/DNS
  private last515: number[] = [];

  getQr() {
    return this.currentQr;
  }

  getStatus(): BotStatus {
    return { ...this.status, hasQr: !!this.currentQr };
  }

  private setStatus(next: Partial<BotStatus>) {
    this.status = { ...this.status, ...next, hasQr: !!this.currentQr };
    wsService.broadcast({ type: "status", payload: this.getStatus() });
  }

  private authDir(instanceId: string) {
    return path.resolve(config.dataDir, "auth_info", instanceId);
  }

  private safeRm(dir: string) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }

  private pushLog(level: "info" | "warn" | "error", msg: string) {
    wsService.broadcast({ type: "log", payload: { ts: new Date().toISOString(), level, msg } });
    if (level === "info") log.info(msg);
    if (level === "warn") log.warn(msg);
    if (level === "error") log.error(msg);
  }

  private mark515() {
    const now = Date.now();
    this.last515 = [...this.last515.filter((t) => now - t < 60_000), now]; // últimos 60s
    return this.last515.length;
  }

  async connect(instanceId = "default") {
    if (this.connecting) {
      this.pushLog("warn", `[${instanceId}] connect() ignorado: já conectando...`);
      return this.getStatus();
    }

    this.instanceId = instanceId;
    this.status.instanceId = instanceId;
    this.manualDisconnect = false;
    this.connecting = true;

    this.currentQr = null;
    this.setStatus({ status: "connecting", connected: false, note: undefined });

    const authFolder = this.authDir(instanceId);
    fs.mkdirSync(authFolder, { recursive: true });

    // logger do baileys em "warn" (menos barulho, mas mostra problemas reais)
    const logger = pino({ level: "warn" });

    try {
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);
      const { version } = await fetchLatestBaileysVersion();

      try {
        this.sock?.end(undefined);
      } catch {}
      this.sock = null;

      const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        browser: ["FluxZap", "Chrome", "1.0.0"],

        // estabilidade (principal)
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 20_000,

        // reduz chance de travar em histórico
        syncFullHistory: false,
        markOnlineOnConnect: false
      });

      this.sock = sock;

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });

      sock.ev.on("connection.update", (u) => {
        const { connection, qr, lastDisconnect } = u;

        if (qr) {
          this.currentQr = qr;
          this.setStatus({ status: "connecting", connected: false, note: undefined });
          this.pushLog("info", `[${instanceId}] Novo QR gerado.`);
        }

        if (connection === "open") {
          this.currentQr = null;
          this.last515 = [];
          this.setStatus({ status: "connected", connected: true, note: undefined });
          this.pushLog("info", `[${instanceId}] Connected ✅`);
          return;
        }

        if (connection === "close") {
          const errAny = lastDisconnect?.error as any;

          const code =
            errAny?.output?.statusCode ??
            errAny?.statusCode ??
            undefined;

          const reason =
            errAny?.output?.payload?.error ??
            errAny?.message ??
            "unknown";

          this.pushLog("warn", `[${instanceId}] Disconnected (code:${code ?? "?"}) reason: ${reason}`);

          if (this.manualDisconnect) {
            this.currentQr = null;
            this.setStatus({ status: "disconnected", connected: false });
            return;
          }

          // loggedOut => precisa reset manual (apagar auth)
          if (code === DisconnectReason.loggedOut) {
            this.currentQr = null;
            this.setStatus({
              status: "disconnected",
              connected: false,
              note: "Sessão inválida (loggedOut). Use RESET para gerar novo QR."
            });
            this.pushLog("error", `[${instanceId}] LoggedOut. Faça /api/bots/reset e gere QR novo.`);
            return;
          }

          // 515 / restartRequired
          if (code === 515 || code === DisconnectReason.restartRequired) {
            const n = this.mark515();

            // Se ficar em loop de 515, isso quase sempre é REDE/Firewall/DNS/ISP
            if (n >= 6) {
              this.currentQr = null;
              this.setStatus({
                status: "disconnected",
                connected: false,
                note:
                  "Loop de 515 detectado. Provável bloqueio de rede/firewall/DNS. Teste Hotspot do celular."
              });
              this.pushLog(
                "error",
                `[${instanceId}] 515 em loop (${n}/min). Parei reconexão automática para evitar QR infinito. Teste hotspot / libere web.whatsapp.com.`
              );
              return;
            }

            this.currentQr = null;
            this.setStatus({ status: "connecting", connected: false, note: "Restart required (515). Reconectando..." });

            // reconecta com backoff leve
            setTimeout(() => {
              this.connect(instanceId).catch(() => {});
            }, 1500 + n * 400);

            return;
          }

          // outros códigos => reconectar com backoff
          this.currentQr = null;
          this.setStatus({ status: "connecting", connected: false, note: "Reconectando..." });
          setTimeout(() => {
            this.connect(instanceId).catch(() => {});
          }, 2500);
        }
      });

      return this.getStatus();
    } catch (e: any) {
      this.currentQr = null;
      this.setStatus({ status: "disconnected", connected: false, note: String(e?.message || e) });
      this.pushLog("error", `[${instanceId}] connect failed: ${e?.message || e}`);
      return this.getStatus();
    } finally {
      this.connecting = false;
    }
  }

  async disconnect() {
    this.manualDisconnect = true;

    try {
      this.sock?.logout();
    } catch {}

    try {
      this.sock?.end(undefined);
    } catch {}

    this.sock = null;
    this.currentQr = null;
    this.setStatus({ status: "disconnected", connected: false, note: undefined });
    this.pushLog("info", `[${this.instanceId}] Disconnected by API.`);
    return this.getStatus();
  }

  async reset(instanceId = "default") {
    this.manualDisconnect = true;
    this.instanceId = instanceId;

    try {
      this.sock?.logout();
    } catch {}
    try {
      this.sock?.end(undefined);
    } catch {}

    this.sock = null;
    this.currentQr = null;

    const authFolder = this.authDir(instanceId);
    this.safeRm(authFolder);

    this.pushLog("info", `[${instanceId}] Reset feito. Gerando novo QR...`);

    this.manualDisconnect = false;
    this.last515 = [];
    return this.connect(instanceId);
  }
}

export const baileysService = new BaileysService();
