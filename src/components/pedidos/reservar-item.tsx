"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { reservarItem } from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function ReservarItem({
  pedidoId,
  disponibles,
}: {
  pedidoId: string;
  disponibles: { id: string; etiqueta: string }[];
}) {
  const [sel, setSel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disponibles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay items disponibles en inventario para reservar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={sel}
          disabled={pending}
          aria-label="Item de inventario disponible"
          onChange={(e) => setSel(e.target.value)}
          className="sm:flex-1"
        >
          <option value="">Elige un item disponible…</option>
          {disponibles.map((d) => (
            <option key={d.id} value={d.id}>
              {d.etiqueta}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          disabled={pending || !sel}
          onClick={() =>
            start(async () => {
              const r = await reservarItem(pedidoId, sel);
              if (r.ok) setSel("");
              setError(r.ok ? null : (r.error ?? "No se pudo reservar."));
            })
          }
        >
          <Plus className="size-4" />
          {pending ? "Reservando…" : "Reservar"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
