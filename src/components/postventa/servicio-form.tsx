"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { registrarServicio, type ResultadoAccion } from "@/app/(app)/ventas/pedidos/postventa-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIPOS_SERVICIO, TIPO_SERVICIO } from "@/lib/postventa";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Registrar servicio"}
    </Button>
  );
}

export function ServicioForm({ piezaId, pedidoId }: { piezaId: string; pedidoId: string }) {
  const [estado, action] = useActionState(registrarServicio, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="pieza_id" value={piezaId} />
      <input type="hidden" name="pedido_id" value={pedidoId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="limpieza">
            {TIPOS_SERVICIO.map((t) => (
              <option key={t} value={t}>
                {TIPO_SERVICIO[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Input id="descripcion" name="descripcion" placeholder="Limpieza anual…" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="costo">Costo (0 = cortesía)</Label>
          <Input id="costo" name="costo" inputMode="numeric" defaultValue="0" className="sm:w-40" />
        </div>
        <Guardar />
      </div>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
    </form>
  );
}
