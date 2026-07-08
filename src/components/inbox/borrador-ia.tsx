"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aprobarBorrador, descartarBorrador } from "@/app/(app)/clientes/inbox/actions";
import { responderInbox } from "@/app/(app)/clientes/inbox/actions";

/*
  Borrador redactado por la IA para un mensaje sensible (2ct+, queja, etc.): NO
  se envió. El humano lo revisa, lo edita si quiere, y lo aprueba (envía) o lo
  descarta. Si lo edita, se envía el texto editado como respuesta propia.
*/
export function BorradorIA({
  mensajeId,
  conversacionId,
  telefono,
  cuerpo,
}: {
  mensajeId: string;
  conversacionId: string;
  telefono: string;
  cuerpo: string;
}) {
  const [texto, setTexto] = useState(cuerpo);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editado = texto.trim() !== cuerpo.trim();

  function aprobar() {
    setError(null);
    start(async () => {
      // Si el humano editó el texto, se envía como respuesta propia y se
      // descarta el borrador; si no, se aprueba el borrador tal cual.
      const r = editado
        ? await responderInbox(conversacionId, telefono, texto)
        : await aprobarBorrador(mensajeId);
      if (r.ok && editado) await descartarBorrador(mensajeId);
      if (!r.ok) setError(r.error ?? "No se pudo enviar.");
    });
  }

  function descartar() {
    setError(null);
    start(async () => {
      const r = await descartarBorrador(mensajeId);
      if (!r.ok) setError(r.error ?? "No se pudo descartar.");
    });
  }

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-warning">
        <Sparkles className="size-3.5" />
        Borrador de la IA · requiere tu aprobación
      </p>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        className="bg-card"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || texto.trim().length === 0} onClick={aprobar}>
          <Check className="size-4" />
          {editado ? "Enviar editado" : "Aprobar y enviar"}
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={descartar}>
          <X className="size-4" />
          Descartar
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}
