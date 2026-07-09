"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { guardarUmbral } from "@/app/(app)/taller/inventario/umbrales/actions";
import { Button } from "@/components/ui/button";
import type { TipoItem } from "@/lib/inventario";

/*
  Fila editable de umbral por categoría: muestra disponibles actuales y deja fijar
  el mínimo. Bajo (disponibles < mínimo) se marca en rojo para dar contexto.
*/
export function UmbralRow({
  tipo,
  etiqueta,
  minimo,
  disponibles,
}: {
  tipo: TipoItem;
  etiqueta: string;
  minimo: number;
  disponibles: number;
}) {
  const [valor, setValor] = useState(String(minimo));
  const [pending, start] = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minNum = Number(valor);
  const bajo = minNum > 0 && disponibles < minNum;
  const sucio = String(minimo) !== valor;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="min-w-40">
        <span className="font-medium text-foreground">{etiqueta}</span>
        <span className={`ml-2 text-xs ${bajo ? "text-destructive" : "text-muted-foreground"}`}>
          {disponibles} disponibles{bajo ? " · bajo" : ""}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Mínimo</label>
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setGuardado(false);
            setError(null);
          }}
          className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !sucio || valor === ""}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await guardarUmbral(tipo, Number(valor));
              if (r.ok) setGuardado(true);
              else setError(r.error ?? "No se pudo guardar.");
            })
          }
        >
          {guardado && !sucio ? <Check className="size-4 text-success" /> : null}
          {pending ? "…" : guardado && !sucio ? "Guardado" : "Guardar"}
        </Button>
      </span>
      {error ? <span className="w-full text-right text-xs text-destructive">{error}</span> : null}
    </li>
  );
}
