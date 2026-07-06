"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import {
  cambiarEstadoCita,
  registrarResultado,
} from "@/app/(app)/clientes/citas/actions";
import { Button } from "@/components/ui/button";
import { RESULTADOS_CITA, RESULTADO_CITA, type EstadoCita, type ResultadoCita } from "@/lib/citas";

export function CitaAcciones({ id, estado }: { id: string; estado: EstadoCita }) {
  const [pending, start] = useTransition();

  if (estado === "completada" || estado === "cancelada") return null;

  const setEstado = (e: EstadoCita) => start(async () => { await cambiarEstadoCita(id, e); });
  const setResultado = (r: ResultadoCita) =>
    start(async () => { await registrarResultado(id, r); });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {estado === "agendada" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => setEstado("confirmada")}>
          <Check className="size-4" />
          Confirmar
        </Button>
      ) : null}
      {/* Captura de resultado (el funnel) en un toque */}
      {RESULTADOS_CITA.map((r) => (
        <Button
          key={r}
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setResultado(r)}
        >
          {RESULTADO_CITA[r].etiqueta}
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setEstado("cancelada")}
        aria-label="Cancelar cita"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
