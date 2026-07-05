"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  crearCotizacion,
  type ResultadoAccion,
} from "@/app/(app)/ventas/cotizaciones/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { METAL } from "@/lib/cotizaciones";
import { pesos } from "@/lib/inventario";

type Linea = { descripcion: string; metal: string; quilataje: string; precio: string };
const lineaVacia: Linea = { descripcion: "", metal: "", quilataje: "", precio: "" };
const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Crear cotización"}
    </Button>
  );
}

export function CotizacionBuilder({
  clientes,
  esAdmin,
}: {
  clientes: { id: string; nombre: string }[];
  esAdmin: boolean;
}) {
  const [estado, action] = useActionState(crearCotizacion, inicial);
  const [lineas, setLineas] = useState<Linea[]>([{ ...lineaVacia }]);
  const [costo, setCosto] = useState("");

  const total = lineas.reduce((s, l) => s + (parseFloat(l.precio) || 0), 0);
  const costoNum = parseFloat(costo) || 0;
  const utilidad = total - costoNum;
  const margenPct = total > 0 ? Math.round((utilidad / total) * 100) : 0;

  const lineasLimpias = lineas
    .filter((l) => l.descripcion.trim() && l.precio)
    .map((l) => ({
      descripcion: l.descripcion.trim(),
      metal: l.metal || null,
      quilataje: l.quilataje || null,
      precio: parseFloat(l.precio) || 0,
    }));

  function setLinea(i: number, campo: keyof Linea, valor: string) {
    setLineas((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)),
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="lineas" value={JSON.stringify(lineasLimpias)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select id="cliente_id" name="cliente_id" defaultValue="">
            <option value="">Sin cliente (borrador)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="valida_hasta">Válida hasta</Label>
          <Input id="valida_hasta" name="valida_hasta" type="date" />
        </div>
      </div>

      {/* Líneas de la pieza */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Componentes de la pieza</Label>
          <span className="text-xs text-muted-foreground">
            El precio es de la pieza completa, nunca por quilate.
          </span>
        </div>

        {lineas.map((l, i) => (
          <div
            key={i}
            className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
          >
            <Input
              placeholder="Descripción (ej. Diamante central 2.2ct)"
              value={l.descripcion}
              onChange={(e) => setLinea(i, "descripcion", e.target.value)}
            />
            <Select
              value={l.metal}
              onChange={(e) => setLinea(i, "metal", e.target.value)}
              className="sm:w-32"
            >
              <option value="">Metal</option>
              {Object.entries(METAL).map(([v, lab]) => (
                <option key={v} value={v}>
                  {lab}
                </option>
              ))}
            </Select>
            <Input
              placeholder="Quilataje"
              value={l.quilataje}
              onChange={(e) => setLinea(i, "quilataje", e.target.value)}
              className="sm:w-24"
            />
            <Input
              placeholder="Precio"
              inputMode="numeric"
              value={l.precio}
              onChange={(e) => setLinea(i, "precio", e.target.value)}
              className="sm:w-28"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar línea"
              onClick={() =>
                setLineas((prev) =>
                  prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev,
                )
              }
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setLineas((prev) => [...prev, { ...lineaVacia }])}
        >
          <Plus className="size-4" />
          Agregar componente
        </Button>
      </div>

      {/* Total y margen */}
      <div className="rounded-lg border border-border bg-secondary/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total (pieza completa)</span>
          <span className="text-xl font-semibold text-foreground">{pesos(total)}</span>
        </div>

        {esAdmin ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="costo_estimado">
                Costo estimado (MXN) — simulador de margen, solo admin
              </Label>
              <Input
                id="costo_estimado"
                name="costo_estimado"
                inputMode="numeric"
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="97000"
                className="sm:w-48"
              />
            </div>
            {costoNum > 0 ? (
              <div className="flex gap-6 text-sm">
                <span className="text-muted-foreground">
                  Utilidad:{" "}
                  <span className="font-semibold text-foreground">
                    {pesos(utilidad)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Margen:{" "}
                  <span className="font-semibold text-accent">{margenPct}%</span>
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" name="notas" placeholder="Detalles de la pieza…" />
      </div>

      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Guardar />
        <Button asChild variant="ghost">
          <a href="/ventas/cotizaciones">Cancelar</a>
        </Button>
      </div>
    </form>
  );
}
