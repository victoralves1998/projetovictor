type AnyEvent = { type: string; payload: any };

class WSClient {
  private sock: WebSocket | null = null;
  private listeners = new Set<(evt: AnyEvent) => void>();
  private reconnectTimer: number | null = null;
  private connecting = false;

  subscribe(fn: (evt: AnyEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(evt: AnyEvent) {
    for (const fn of this.listeners) fn(evt);
  }

  connect() {
    if (this.sock && (this.sock.readyState === WebSocket.OPEN || this.sock.readyState === WebSocket.CONNECTING)) return;
    if (this.connecting) return;

    this.connecting = true;

    const url = "ws://localhost:3001/ws";
    this.sock = new WebSocket(url);

    this.sock.onopen = () => {
      this.connecting = false;
    };

    this.sock.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data);
        this.emit(data);
      } catch {
        // ignore
      }
    };

    this.sock.onclose = () => {
      this.connecting = false;

      if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = window.setTimeout(() => this.connect(), 1500);
    };

    this.sock.onerror = () => {
      // deixa o onclose cuidar do reconnect
    };
  }
}

export const ws = new WSClient();
