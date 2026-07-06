"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  crearComision,
  type ResultadoAccion,
} from "@/app/(app)/dinero/comisiones/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIPO_COMISION, type TipoComision } from "@/lib/comisiones";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Registrar comisión"}
    </Button>
  );
}

export function ComisionForm({
  pedidos,
}: {
  pedidos: { id: string; etiqueta: string }[];
}) {
  const [estado, action] = useActionState(crearComision, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (pedidos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay pedidos con costo real capturado. Captura el costo del pedido (en su ficha) para poder calcular comisiones.
      </p>
    );
  }

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Registrar comisión
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="pedido_id">Pedido</Label>
        <Select id="pedido_id" name="pedido_id" defaultValue="">
          <option value="" disabled>
            Elige un pedido…
          </option>
          {pedidos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.etiqueta}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="beneficiario">Beneficiario</Label>
          <Input id="beneficiario" name="beneficiario" placeholder="Nombre" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="referidor">
            {(Object.keys(TIPO_COMISION) as TipoComision[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_COMISION[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="porcentaje">% sobre utilidad</Label>
          <Input id="porcentaje" name="porcentaje" inputMode="decimal" placeholder="10" required />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        El monto se calcula solo: % sobre la utilidad real (total − costo real) del pedido.
      </p>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      <div className="flex items-center gap-2">
        <Guardar />
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
