import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import QrPanel from "../components/QrPanel";
import LogViewer from "../components/LogViewer";
import StatusPill from "../components/StatusPill";

type BotStatus = {
  instanceId: string;
  status: "disconnected" | "connecting" | "connected";
  connected: boolean;
  hasQr: boolean;
  note?: string;
};

export default function Dashboard() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const isConnected = !!status?.connected;
  const isConnecting = status?.status === "connecting";

  async function fetchStatusAndQr() {
    const st = await api.get<BotStatus>("/api/bots/status").then((r) => r.data);
    setStatus(st);
    const q = await api.get<{ qr: string | null }>("/api/bots/qr").then((r) => r.data);
    setQr(q.qr || null);
  }

  async function ensure() {
    const st = await api.post<BotStatus>("/api/bots/ensure", { instanceId: "default" }).then((r) => r.data);
    setStatus(st);
    const q = await api.get<{ qr: string | null }>("/api/bots/qr").then((r) => r.data);
    setQr(q.qr || null);
  }

  async function refreshQr() {
    const st = await api.post<BotStatus>("/api/bots/refresh-qr", { instanceId: "default" }).then((r) => r.data);
    setStatus(st);
    const q = await api.get<{ qr: string | null }>("/api/bots/qr").then((r) => r.data);
    setQr(q.qr || null);
  }

  async function connect() {
    const st = await api.post<BotStatus>("/api/bots/connect", { instanceId: "default" }).then((r) => r.data);
    setStatus(st);
    await fetchStatusAndQr();
  }

  async function disconnect() {
    const st = await api.post<BotStatus>("/api/bots/disconnect").then((r) => r.data);
    setStatus(st);
    setQr(null);
  }

  async function reset() {
    const st = await api.post<BotStatus>("/api/bots/reset", { instanceId: "default" }).then((r) => r.data);
    setStatus(st);
    await fetchStatusAndQr();
  }

  useEffect(() => {
    fetchStatusAndQr().then(() => ensure()).catch(() => {});
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    if (isConnected) return;

    // renova QR automaticamente a cada 90s enquanto não conectar
    timerRef.current = window.setInterval(() => {
      refreshQr().catch(() => {});
    }, 90_000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Painel de Controle</h1>
          <p className="mt-1 text-sm text-slate-500">Status, conexão e monitoramento em tempo real.</p>

          {status?.note ? (
            <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              <b>Aviso:</b> {status.note}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {status ? <StatusPill status={status.status} /> : null}
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            WS: ON
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">Status do Sistema</div>
                <div className="text-xs text-slate-500">
                  {isConnected ? "Sessão ativa e sincronizada" : isConnecting ? "Estabelecendo conexão..." : "Sessão inativa"}
                </div>
              </div>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  isConnected
                    ? "bg-emerald-100 text-emerald-800"
                    : isConnecting
                    ? "bg-orange-100 text-orange-800"
                    : "bg-rose-100 text-rose-800"
                ].join(" ")}
              >
                {isConnected ? "Conectado" : isConnecting ? "Conectando" : "Desconectado"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-700">Ações</div>

            <div className="mt-4 space-y-3">
              <button
                onClick={connect}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={isConnecting}
              >
                Conectar
              </button>

              <button
                onClick={disconnect}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Desconectar
              </button>

              <button
                onClick={reset}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Gerar novo QR (Reset)
              </button>

              <button
                onClick={fetchStatusAndQr}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Atualizar
              </button>

              <div className="pt-2 text-xs text-slate-600">
                <div>Instância: <b>default</b></div>
                <div>Tem QR: <b>{qr ? "sim" : "não"}</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Conectar com QR Code</div>
                <div className="text-sm text-slate-500">Aponte a câmera do WhatsApp para o QR Code ao lado.</div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                ✓
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Como conectar:</div>
                <ol className="mt-3 space-y-3 text-sm text-slate-700">
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      1
                    </span>
                    Abra o WhatsApp no celular.
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      2
                    </span>
                    Toque em <b>Mais opções</b> (três pontos) ou <b>Configurações</b>.
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      3
                    </span>
                    Selecione <b>Aparelhos conectados</b> e depois <b>Conectar aparelho</b>.
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      4
                    </span>
                    Aponte a câmera para o QR Code.
                  </li>
                </ol>
              </div>

              <QrPanel qr={qr} />
            </div>
          </div>

          <div className="mt-6">
            <LogViewer />
          </div>
        </div>
      </div>
    </div>
  );
}
