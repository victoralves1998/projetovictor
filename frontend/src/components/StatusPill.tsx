export default function StatusPill({ status }: { status: "disconnected" | "connecting" | "connected" }) {
  const cls =
    status === "connected"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "connecting"
      ? "border-orange-200 bg-orange-50 text-orange-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  const label = status === "connected" ? "Conectado" : status === "connecting" ? "Conectando" : "Desconectado";

  return <div className={`rounded-full border px-3 py-1 text-xs font-bold ${cls}`}>{label}</div>;
}
