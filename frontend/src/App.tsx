import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import Inbox from "./pages/Inbox";

function ErrorFallback({ error }: { error: unknown }) {
  const msg =
    error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ""}` : String(error);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-extrabold text-rose-700">Frontend quebrou (ErrorBoundary)</div>
        <p className="mt-2 text-sm text-slate-600">
          Copie o erro abaixo e cole aqui no chat que eu ajusto.
        </p>
        <pre className="mt-4 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100 whitespace-pre-wrap">
          {msg}
        </pre>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) return <ErrorFallback error={this.state.error} />;
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Shell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Shell>
    </ErrorBoundary>
  );
}
