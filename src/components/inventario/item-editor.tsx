"use client";

import { useState, useTransition } from "react";
import { actualizarItem } from "@/app/(app)/taller/inventario/actions";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ESTADO_ITEM, ESTADOS_ITEM, type EstadoItem } from "@/lib/inventario";

export function ItemEditor({
  itemId,
  estado,
  ubicacion,
}: {
  itemId: string;
  estado: EstadoItem;
  ubicacion: string | null;
}) {
  const [est, setEst] = useState<EstadoItem>(estado);
  const [ubic, setUbic] = useState(ubicacion ?? "");
  const [pending, start] = useTransition();
  const [guardado, setGuardado] = useState(false);

  function guardar(cambios: { estado?: EstadoItem; ubicacion?: string }) {
    start(async () => {
      await actualizarItem(itemId, cambios);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Estado</label>
        <Select
          value={est}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value as EstadoItem;
            setEst(v);
            guardar({ estado: v });
          }}
          className="sm:w-44"
        >
          {ESTADOS_ITEM.map((s) => (
            <option key={s} value={s}>
              {ESTADO_ITEM[s].etiqueta}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Ubicación</label>
        <div className="flex gap-2">
          <Input
            value={ubic}
            onChange={(e) => setUbic(e.target.value)}
            placeholder="Vitrina 3"
            className="sm:w-44"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => guardar({ ubicacion: ubic })}
          >
            {guardado ? "✓" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
