"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { eliminarCliente } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";

/*
  Borra un cliente (solo-admin). Doble clic con confirmación para evitar borrados
  accidentales. Pensado para limpiar clientes de prueba/duplicados. Un cliente con
  pedidos no se puede borrar (lo avisa la acción).
*/
export function EliminarCliente({ clienteId, nombre }: { clienteId: string; nombre: string }) {
  const [confirmar, setConfirmar] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirmar) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirmar(true)}>
        <Trash2 className="size-4 text-destructive" />
        Borrar
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">¿Borrar a {nombre}?</span>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmar(false)}>
          Cancelar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await eliminarCliente(clienteId);
              // Si borra, la acción redirige; si no, muestra el error.
              if (r && !r.ok) setError(r.error ?? "No se pudo borrar.");
            })
          }
        >
          {pending ? "Borrando…" : "Sí, borrar"}
        </Button>
      </div>
      {error ? <span className="max-w-xs text-right text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
