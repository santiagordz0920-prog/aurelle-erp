"use client";

import { useTransition } from "react";
import { alternarGasto } from "@/app/(app)/dinero/gastos/actions";
import { Badge } from "@/components/ui/badge";
import { posteadoEsteMes, type GastoRecurrente } from "@/lib/gastos";
import { pesos } from "@/lib/inventario";

export function GastoItem({ gasto }: { gasto: GastoRecurrente }) {
  const [pending, start] = useTransition();
  const posteado = posteadoEsteMes(gasto);

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${gasto.activo ? "text-foreground" : "text-muted-foreground line-through"}`}>
          {gasto.concepto}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {gasto.categoria ? <span>{gasto.categoria}</span> : null}
          <span>· día {gasto.dia_cargo}</span>
          {posteado ? (
            <Badge className="bg-success/15 text-success">Posteado este mes</Badge>
          ) : gasto.activo ? (
            <Badge className="bg-warning/15 text-warning">Pendiente del mes</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-foreground">{pesos(gasto.monto)}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await alternarGasto(gasto.id, !gasto.activo); })}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {gasto.activo ? "Pausar" : "Reactivar"}
        </button>
      </div>
    </li>
  );
}
