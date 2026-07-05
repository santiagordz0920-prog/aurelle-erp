"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  setCostoReal,
  type ResultadoAccion,
} from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button variant="outline" size="sm" type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar costo"}
    </Button>
  );
}

export function CostoForm({
  pedidoId,
  costoActual,
}: {
  pedidoId: string;
  costoActual: number | null | undefined;
}) {
  const [estado, action] = useActionState(setCostoReal, inicial);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <input type="hidden" name="pedido_id" value={pedidoId} />
      <div className="space-y-1.5">
        <Label htmlFor="costo_real">Costo real acumulado (MXN)</Label>
        <Input
          id="costo_real"
          name="costo_real"
          inputMode="numeric"
          defaultValue={costoActual != null ? String(costoActual) : ""}
          placeholder="97000"
          className="sm:w-48"
        />
      </div>
      <Guardar />
      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}
    </form>
  );
}
