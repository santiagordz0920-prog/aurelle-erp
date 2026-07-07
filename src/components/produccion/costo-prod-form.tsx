"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  agregarCostoProduccion,
  type ResultadoAccion,
} from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIPOS_COSTO_PROD, TIPO_COSTO_PROD } from "@/lib/produccion";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar costo"}
    </Button>
  );
}

export function CostoProdForm({ ordenId }: { ordenId: string }) {
  const [estado, action] = useActionState(agregarCostoProduccion, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="orden_id" value={ordenId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="casting">
            {TIPOS_COSTO_PROD.map((t) => (
              <option key={t} value={t}>
                {TIPO_COSTO_PROD[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="concepto">Concepto</Label>
          <Input id="concepto" name="concepto" placeholder="Casting externo…" required />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input id="monto" name="monto" inputMode="numeric" placeholder="8000" className="sm:w-40" required />
        </div>
        <Guardar />
      </div>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
    </form>
  );
}
