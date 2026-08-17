"use client";

import { useState, useEffect } from "react";
import { Heart, Download, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function QrPage() {
  const [mounted, setMounted] = useState(false);
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  const qrImageUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
        appUrl
      )}&color=1f-2d-27&bgcolor=faf-8f5`
    : "";

  const downloadQR = async () => {
    if (!qrImageUrl) return;
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "PhotoParty-Kod-QR-Wesele.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Błąd pobierania QR:", e);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-[#faf8f5] text-[#2c3e35] flex flex-col items-center justify-center p-4 selection:bg-emerald-200"
      suppressHydrationWarning
    >
      <div className="max-w-sm w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-[#e8e2d8] space-y-6 relative">
        <Link
          href="/"
          className="absolute top-4 left-4 p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-full transition"
          title="Powrót do aplikacji"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-800 mb-1">
            <span>Wesele</span>
            <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
          </div>
          <h1 className="text-2xl font-serif font-extrabold text-[#1f2d27]">
            Kinga & Kamil
          </h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-wider">
            Zeskanuj i dodaj zdjęcia! 📸
          </p>
        </div>

        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 flex flex-col items-center justify-center shadow-inner">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrImageUrl}
              alt="Kod QR do albumu weselnego"
              className="w-[200px] h-[200px] rounded-xl object-contain shadow-xs"
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          )}
          <p className="text-[11px] text-stone-400 mt-4 break-all font-mono">
            {appUrl}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={downloadQR}
            className="w-full py-3 bg-[#2c3e35] hover:bg-[#1f2d27] text-[#f4efe6] text-sm font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-300" />
            Pobierz QR do druku (PNG)
          </button>

          <Link
            href="/"
            className="block w-full py-3 bg-[#faf8f5] hover:bg-[#e8e2d8] text-[#2c3e35] text-sm font-semibold rounded-xl border border-[#e8e2d8] transition text-center"
          >
            Przejdź do albumu
          </Link>
        </div>
      </div>
    </main>
  );
}