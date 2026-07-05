"use client";

import { useState, useTransition } from "react";
import { cambiarEstado } from "@/app/(app)/clientes/actions";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PIPELINE_ORDEN,
  ESTADO_PIPELINE,
  type EstadoPipeline,
} from "@/lib/clientes";

const TODOS: EstadoPipeline[] = [...PIPELINE_ORDEN, "perdido"];

/* Cambia la etapa del pipeline desde la ficha. Si es "perdido", pide motivo. */
export function EstadoSelector({
  clienteId,
  estado,
  motivo,
}: {
  clienteId: string;
  estado: EstadoPipeline;
  motivo: string | null;
}) {
  const [sel, setSel] = useState<EstadoPipeline>(estado);
  const [motivoTxt, setMotivoTxt] = useState(motivo ?? "");
  const [pending, start] = useTransition();

  function aplicar(nuevo: EstadoPipeline, m?: string) {
    start(async () => {
      await cambiarEstado(clienteId, nuevo, m);
    });
  }

  function onChange(nuevo: EstadoPipeline) {
    setSel(nuevo);
    if (nuevo !== "perdido") aplicar(nuevo);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={sel}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as EstadoPipeline)}
        className="sm:w-52"
      >
        {TODOS.map((s) => (
          <option key={s} value={s}>
            {ESTADO_PIPELINE[s].etiqueta}
          </option>
        ))}
      </Select>

      {sel === "perdido" ? (
        <div className="flex gap-2">
          <Input
            value={motivoTxt}
            onChange={(e) => setMotivoTxt(e.target.value)}
            placeholder="Motivo de pérdida"
            className="sm:w-52"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => aplicar("perdido", motivoTxt)}
          >
            Guardar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
