"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  registrarPrecioMetal,
  type ResultadoAccion,
} from "@/app/(app)/ventas/cotizaciones/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { METAL, type PrecioMetal } from "@/lib/cotizaciones";
import { pesos } from "@/lib/inventario";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : "Actualizar"}
    </Button>
  );
}

/* Captura manual del precio de metal (solo admin). El feed automático de la API
   de precios se enchufa después sin cambiar esta UI. */
export function PrecioMetalForm({ precios }: { precios: PrecioMetal[] }) {
  const [estado, action] = useActionState(registrarPrecioMetal, inicial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {precios.map((p) => (
          <span
            key={p.id}
            className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
          >
            {METAL[p.metal]} {p.pureza ?? ""}:{" "}
            <span className="font-medium text-foreground">
              {pesos(p.precio_gramo_mxn)}/g
            </span>
          </span>
        ))}
      </div>
      <form
        ref={ref}
        action={action}
        className="flex flex-wrap items-end gap-2"
      >
        <Select name="metal" defaultValue="oro" className="w-28">
          {Object.entries(METAL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input name="pureza" placeholder="18k" className="w-20" />
        <Input
          name="precio_gramo_mxn"
          inputMode="numeric"
          placeholder="$/gramo"
          className="w-28"
          required
        />
        <Guardar />
        {estado.error ? (
          <span className="text-xs text-destructive">{estado.error}</span>
        ) : null}
      </form>
    </div>
  );
}
