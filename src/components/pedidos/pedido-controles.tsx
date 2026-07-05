"use client";

import { useState, useTransition } from "react";
import {
  cambiarEstado,
  cambiarLinea,
} from "@/app/(app)/ventas/pedidos/actions";
import { Select } from "@/components/ui/select";
import {
  ESTADO_PEDIDO,
  ESTADOS_PEDIDO,
  LINEA_NEGOCIO,
  type EstadoPedido,
  type LineaNegocio,
} from "@/lib/pedidos";

export function PedidoControles({
  id,
  estado,
  linea,
}: {
  id: string;
  estado: EstadoPedido;
  linea: LineaNegocio;
}) {
  const [est, setEst] = useState(estado);
  const [lin, setLin] = useState(linea);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Select
        value={est}
        disabled={pending}
        aria-label="Estado del pedido"
        onChange={(e) => {
          const v = e.target.value as EstadoPedido;
          setEst(v);
          start(async () => {
            await cambiarEstado(id, v);
          });
        }}
        className="sm:w-52"
      >
        {ESTADOS_PEDIDO.map((s) => (
          <option key={s} value={s}>
            {ESTADO_PEDIDO[s].etiqueta}
          </option>
        ))}
      </Select>
      <Select
        value={lin}
        disabled={pending}
        aria-label="Línea de negocio"
        onChange={(e) => {
          const v = e.target.value as LineaNegocio;
          setLin(v);
          start(async () => {
            await cambiarLinea(id, v);
          });
        }}
        className="sm:w-52"
      >
        {(Object.keys(LINEA_NEGOCIO) as LineaNegocio[]).map((l) => (
          <option key={l} value={l}>
            Línea: {LINEA_NEGOCIO[l]}
          </option>
        ))}
      </Select>
    </div>
  );
}
