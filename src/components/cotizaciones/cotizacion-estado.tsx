"use client";

import { useState, useTransition } from "react";
import { cambiarEstadoCotizacion } from "@/app/(app)/ventas/cotizaciones/actions";
import { Select } from "@/components/ui/select";
import {
  ESTADO_COTIZACION,
  ESTADOS_COTIZACION,
  type EstadoCotizacion,
} from "@/lib/cotizaciones";

export function CotizacionEstado({
  id,
  estado,
}: {
  id: string;
  estado: EstadoCotizacion;
}) {
  const [sel, setSel] = useState(estado);
  const [pending, start] = useTransition();
  return (
    <Select
      value={sel}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value as EstadoCotizacion;
        setSel(v);
        start(async () => {
          await cambiarEstadoCotizacion(id, v);
        });
      }}
      className="sm:w-48"
    >
      {ESTADOS_COTIZACION.map((s) => (
        <option key={s} value={s}>
          {ESTADO_COTIZACION[s].etiqueta}
        </option>
      ))}
    </Select>
  );
}
