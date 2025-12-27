import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { logService, type LogItem } from "./log.service";

type WsMessage =
  | { type: "hello"; payload: { ok: true; lastLogs: LogItem[] } }
  | { type: "log"; payload: LogItem }
  | { type: "status"; payload: any };

class WsService {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  init(httpServer: HttpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      const hello: WsMessage = {
        type: "hello",
        payload: { ok: true, lastLogs: logService.list() }
      };
      ws.send(JSON.stringify(hello));

      ws.on("close", () => this.clients.delete(ws));
      ws.on("error", () => this.clients.delete(ws));
    });
  }

  broadcast(message: WsMessage) {
    const data = JSON.stringify(message);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }

  broadcastLog(item: LogItem) {
    this.broadcast({ type: "log", payload: item });
  }

  broadcastStatus(payload: any) {
    this.broadcast({ type: "status", payload });
  }
}

export const wsService = new WsService();
