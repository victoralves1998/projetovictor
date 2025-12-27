import type http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./log.service";
import { baileysService } from "./baileys.service";

type WsMsg =
  | { type: "hello"; payload: { ok: true; lastLogs: any[] } }
  | { type: "log"; payload: any }
  | { type: "status"; payload: any };

class WsService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  attach(server: http.Server) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      const hello: WsMsg = {
        type: "hello",
        payload: { ok: true, lastLogs: log.getLastLogs() }
      };
      ws.send(JSON.stringify(hello));

      // manda status atual do bot ao conectar
      const st: WsMsg = { type: "status", payload: baileysService.getStatus() };
      ws.send(JSON.stringify(st));

      ws.on("close", () => this.clients.delete(ws));
      ws.on("error", () => this.clients.delete(ws));
    });
  }

  broadcast(msg: WsMsg) {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}

export const wsService = new WsService();
