import { useEffect, useState } from "react";

interface QrPanelProps {
  qr: string | null;
}

export default function QrPanel({ qr }: QrPanelProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function generateQr() {
      if (!qr) {
        setDataUrl(null);
        return;
      }

      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(qr, {
          margin: 2,
          scale: 6,
        });

        if (mounted) setDataUrl(url);
      } catch (err) {
        console.error("Erro ao gerar QR:", err);
        if (mounted) setDataUrl(null);
      }
    }

    generateQr();

    return () => {
      mounted = false;
    };
  }, [qr]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR Code WhatsApp"
          className="h-64 w-64 rounded-xl border bg-white p-3 shadow"
        />
      ) : (
        <div className="flex h-64 w-64 items-center justify-center rounded-xl border border-dashed text-sm text-slate-400">
          Sem QR disponível
        </div>
      )}
    </div>
  );
}
