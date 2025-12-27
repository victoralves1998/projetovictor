import { NavLink } from "react-router-dom";

function Item({
  to,
  label
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
          isActive
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-200 hover:bg-slate-800/50 hover:text-white"
        ].join(" ")
      }
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-200">
        {/* ícone simples */}
        ●
      </span>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <div className="px-6 py-6">
        <div className="text-xl font-extrabold tracking-tight">
          <span className="text-blue-400">Flux</span>
          <span className="text-orange-400">Zap</span>
        </div>
        <div className="mt-1 text-xs text-slate-300">Painel Web • Automação WhatsApp</div>
      </div>

      <div className="px-4">
        <div className="px-3 text-[11px] font-bold tracking-widest text-slate-400">MENU</div>
        <nav className="mt-3 space-y-2">
          <Item to="/dashboard" label="Dashboard" />
          <Item to="/builder" label="Construtor" />
          <Item to="/inbox" label="Inbox CRM" />
        </nav>

        <div className="mt-6 rounded-2xl bg-slate-800/40 p-4 text-xs text-slate-200">
          <div className="font-bold text-slate-100">Dica</div>
          <div className="mt-1">Use o Dashboard para gerar QR e acompanhar logs ao vivo.</div>
        </div>

        <div className="mt-6 px-2 text-[11px] text-slate-400">v1.0 • FluxZap</div>
      </div>
    </aside>
  );
}
