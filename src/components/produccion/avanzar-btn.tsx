"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { moverEtapa } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";
import {
  ETAPA_PRODUCCION,
  siguienteEtapa,
  type EtapaProduccion,
} from "@/lib/produccion";

export function AvanzarBtn({
  ordenId,
  etapa,
  qcOk,
  size = "sm",
}: {
  ordenId: string;
  etapa: EtapaProduccion;
  qcOk: boolean;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const sig = siguienteEtapa(etapa);
  if (!sig) return null; // ya está en listo para entrega

  const bloqueadoPorQC = sig === "listo_entrega" && !qcOk;

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size={size}
        disabled={pending || bloqueadoPorQC}
        title={bloqueadoPorQC ? "Completa el QC primero" : undefined}
        onClick={() =>
          start(async () => {
            const r = await moverEtapa(ordenId, sig);
            setError(r.ok ? null : (r.error ?? "No se pudo mover."));
          })
        }
      >
        {pending ? "Moviendo…" : `A ${ETAPA_PRODUCCION[sig].etiqueta}`}
        <ChevronRight className="size-4" />
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
