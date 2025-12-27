import http from "http";
import { createApp } from "./app";
import { config } from "./config";
import { wsService } from "./services/ws.service";
import { logService } from "./services/log.service";

async function main() {
  const app = createApp();
  const server = http.createServer(app);

  wsService.init(server);

  server.listen(config.port, () => {
    const item = logService.push(
      "info",
      `FluxZap Backend running on http://localhost:${config.port} (WS: /ws)`
    );
    console.log(item.msg);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
