"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Errore durante l'avvio della generazione.");
        return;
      }

      setStatus("done");
      setMessage("Generazione avviata: i nuovi post appariranno qui a breve.");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Impossibile contattare il server.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {status === "loading" ? "Avvio in corso…" : "Genera ora"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
