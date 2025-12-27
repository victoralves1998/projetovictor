import http from "http";
import app from "./app";
import { config } from "./config";
import { wsService } from "./services/ws.service";
import { log } from "./services/log.service";

const server = http.createServer(app);

wsService.attach(server);

server.listen(config.port, () => {
  log.info(`FluxZap Backend running on http://localhost:${config.port} (WS: /ws)`);
});
