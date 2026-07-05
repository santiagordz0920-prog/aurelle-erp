"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { crearMovimiento, type ResultadoAccion } from "@/app/(app)/dinero/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORIAS, CATEGORIA_MOVIMIENTO } from "@/lib/finanzas";
import { LINEA_NEGOCIO, type LineaNegocio } from "@/lib/pedidos";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Registrar movimiento"}
    </Button>
  );
}

export function MovimientoForm() {
  const [estado, action] = useActionState(crearMovimiento, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Registrar movimiento manual
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
        <Label htmlFor="concepto">Concepto</Label>
        <Input id="concepto" name="concepto" placeholder="Ej. Renta Ellion (julio)" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <Select id="categoria" name="categoria" defaultValue="gasto">
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_MOVIMIENTO[c].etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input id="monto" name="monto" inputMode="numeric" placeholder="35000" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linea_negocio">Línea (opcional)</Label>
          <Select id="linea_negocio" name="linea_negocio" defaultValue="">
            <option value="">—</option>
            {(Object.keys(LINEA_NEGOCIO) as LineaNegocio[]).map((l) => (
              <option key={l} value={l}>
                {LINEA_NEGOCIO[l]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="folio_factura">Folio de factura (opcional)</Label>
        <Input id="folio_factura" name="folio_factura" placeholder="Para reconciliar con el contador" />
      </div>
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
