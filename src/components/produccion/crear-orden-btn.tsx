"use client";

import { useState, useTransition } from "react";
import { Hammer } from "lucide-react";
import { crearOrden } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";

export function CrearOrdenBtn({ pedidoId }: { pedidoId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await crearOrden(pedidoId);
            if (!r.ok) setError(r.error ?? "No se pudo crear la orden.");
          })
        }
      >
        <Hammer className="size-4" />
        {pending ? "Creando…" : "Crear orden de producción"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
