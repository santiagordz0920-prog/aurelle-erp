"use client";

import { useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { consumirMaterial } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";

/*
  Botón para marcar un item de inventario RESERVADO como consumido (entró en la
  pieza). Al consumir, el costo del item suma al costo_real del pedido (0026).
  Solo aparece en items reservados; los consumidos se muestran ya marcados.
*/
export function ConsumirMaterial({
  itemId,
  pedidoId,
  ordenId,
}: {
  itemId: string;
  pedidoId: string;
  ordenId: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await consumirMaterial(itemId, pedidoId, ordenId);
            if (!r.ok) setError(r.error ?? "No se pudo consumir.");
          })
        }
      >
        <PackageCheck className="size-4" />
        {pending ? "…" : "Marcar consumido"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
