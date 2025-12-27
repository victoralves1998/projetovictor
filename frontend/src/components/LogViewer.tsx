import { useEffect, useRef, useState } from "react";
import { ws } from "../lib/ws";

type LogItem = {
  ts: string;
  level: "info" | "warn" | "error";
  msg: string;
};

export default function LogViewer() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const unsub = ws.subscribe((evt) => {
      if (evt.type === "log") {
        const item = evt.payload as LogItem;
        setLogs((prev) => [...prev, item].slice(-50));
      }
      if (evt.type === "logs:init") {
        const items = evt.payload as LogItem[];
        setLogs(items.slice(-50));
      }
    });

    ws.connect();
    return () => unsub();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Logs ao vivo</div>
        <div className="text-xs text-slate-500">Últimos 50</div>
      </div>

      <div className="mt-4 max-h-[260px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
        {logs.length === 0 ? (
          <div className="p-3 text-sm text-slate-500">Sem logs ainda.</div>
        ) : (
          <div className="space-y-2">
            {logs.map((l, idx) => (
              <div
                key={idx}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-mono",
                  l.level === "error"
                    ? "bg-rose-50 text-rose-900"
                    : l.level === "warn"
                    ? "bg-orange-50 text-orange-900"
                    : "bg-white text-slate-900"
                ].join(" ")}
              >
                <span className="text-slate-500">{new Date(l.ts).toLocaleTimeString()}</span>{" "}
                <span className="font-bold">[{l.level.toUpperCase()}]</span> {l.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
