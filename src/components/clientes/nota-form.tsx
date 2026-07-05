"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { agregarNota, type ResultadoAccion } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const inicial: ResultadoAccion = { ok: false };

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Agregar nota"}
    </Button>
  );
}

export function NotaForm({ clienteId }: { clienteId: string }) {
  const [estado, action] = useActionState(agregarNota, inicial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <Textarea
        name="texto"
        required
        placeholder="Nota interna (no la ve el cliente)…"
      />
      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}
      <div className="flex justify-end">
        <Enviar />
      </div>
    </form>
  );
}
