"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { crearTareaAtasco } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";

/* Botón para levantar una tarea de seguimiento cuando la orden lleva ≥7d atascada. */
export function CrearTareaAtasco({ ordenId }: { ordenId: string }) {
  const [pending, start] = useTransition();
  const [creada, setCreada] = useState(false);

  if (creada) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-success">
        <Check className="size-4" />
        Tarea creada
      </span>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await crearTareaAtasco(ordenId);
          if (r.ok) setCreada(true);
        })
      }
    >
      <AlertTriangle className="size-4 text-warning" />
      {pending ? "…" : "Crear tarea de seguimiento"}
    </Button>
  );
}
