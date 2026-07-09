"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { registrarGasto, type ResultadoAccion } from "@/app/(app)/crecimiento/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CANAL_FUENTE } from "@/lib/clientes";
import type { CanalFuente } from "@/lib/clientes";

const inicial: ResultadoAccion = { ok: false };
const CANALES: CanalFuente[] = ["ads", "expo", "referido", "organico"];

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar gasto"}
    </Button>
  );
}

export function GastoForm({ mesActual }: { mesActual: string }) {
  const [estado, action] = useActionState(registrarGasto, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="periodo_mes">Mes</Label>
          <Input id="periodo_mes" name="periodo_mes" type="month" defaultValue={mesActual} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="canal">Canal</Label>
          <Select id="canal" name="canal" defaultValue="ads">
            {CANALES.map((c) => (
              <option key={c} value={c}>
                {CANAL_FUENTE[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="detalle">Campaña / zona</Label>
          <Input id="detalle" name="detalle" placeholder="Fase 1 SPGG…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input id="monto" name="monto" inputMode="numeric" placeholder="18000" required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Guardar />
        {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      </div>
    </form>
  );
}
