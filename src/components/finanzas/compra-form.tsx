"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { crearCompra, type ResultadoAccion } from "@/app/(app)/dinero/compras/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CONDICION_COMPRA, TIPO_COMPRA, type CondicionCompra } from "@/lib/compras";
import { TIPO_ITEM, type TipoItem } from "@/lib/inventario";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Registrar compra"}
    </Button>
  );
}

export function CompraForm({
  proveedores,
}: {
  proveedores: { id: string; nombre: string }[];
}) {
  const [estado, action] = useActionState(crearCompra, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Registrar compra
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
        <Input id="concepto" name="concepto" placeholder="Ej. Casting de 3 monturas" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proveedor_id">Proveedor</Label>
          <Select id="proveedor_id" name="proveedor_id" defaultValue="">
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input id="monto" name="monto" inputMode="numeric" placeholder="9000" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="inventario">
            {(Object.keys(TIPO_COMPRA) as (keyof typeof TIPO_COMPRA)[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_COMPRA[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="condicion_pago">Condición</Label>
          <Select id="condicion_pago" name="condicion_pago" defaultValue="contado">
            {(Object.keys(CONDICION_COMPRA) as CondicionCompra[]).map((c) => (
              <option key={c} value={c}>
                {CONDICION_COMPRA[c].etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fecha_vencimiento">Vence (solo si es a crédito)</Label>
        <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" className="sm:w-48" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input id="notas" name="notas" placeholder="Detalle de la compra…" />
      </div>

      {/* Alta opcional en inventario (solo aplica a compras de tipo Inventario). */}
      <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs text-muted-foreground">
          Dar de alta la pieza en inventario (opcional; solo compras de tipo Inventario). El costo será el monto de la compra.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="item_sku">SKU</Label>
            <Input id="item_sku" name="item_sku" placeholder="MON-015" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item_tipo">Tipo de pieza</Label>
            <Select id="item_tipo" name="item_tipo" defaultValue="montura">
              {(Object.keys(TIPO_ITEM) as TipoItem[]).map((t) => (
                <option key={t} value={t}>
                  {TIPO_ITEM[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="item_nombre">Nombre</Label>
            <Input id="item_nombre" name="item_nombre" placeholder="Montura solitario 14k" />
          </div>
        </div>
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
