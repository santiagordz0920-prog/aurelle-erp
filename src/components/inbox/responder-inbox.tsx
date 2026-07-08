"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { responderInbox } from "@/app/(app)/clientes/inbox/actions";

/* Compositor de respuesta por la Cloud API (riel vivo). Envía y guarda el
   mensaje saliente; el hilo se revalida solo. */
export function ResponderInbox({
  conversacionId,
  telefono,
}: {
  conversacionId: string;
  telefono: string;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function enviar() {
    if (texto.trim().length === 0) return;
    setError(null);
    start(async () => {
      const r = await responderInbox(conversacionId, telefono, texto);
      if (r.ok) setTexto("");
      else setError(r.error ?? "No se pudo enviar.");
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escribe tu respuesta…"
        rows={3}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            enviar();
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || texto.trim().length === 0} onClick={enviar}>
          <Send className="size-4" />
          {pending ? "Enviando…" : "Enviar"}
        </Button>
        <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}
