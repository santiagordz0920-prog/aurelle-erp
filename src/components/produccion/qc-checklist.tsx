"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, RotateCcw } from "lucide-react";
import { marcarQC } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";

/*
  Checklist de QC pre-vuelo por tipo de pieza. Fer marca cada punto; solo con
  todos marcados se habilita "Marcar QC completo" (candado a listo para entrega).
  El estado de los checks es efímero; lo que persiste es `qc_ok`.
*/
export function QcChecklist({
  ordenId,
  qcOk,
  items,
}: {
  ordenId: string;
  qcOk: boolean;
  items: string[];
}) {
  const [marcados, setMarcados] = useState<boolean[]>(() => items.map(() => qcOk));
  const [pending, start] = useTransition();
  const todos = marcados.length > 0 && marcados.every(Boolean);

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={item}>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={marcados[i]}
                disabled={qcOk || pending}
                onChange={(e) =>
                  setMarcados((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))
                }
                className="mt-0.5 size-4 shrink-0"
              />
              <span className={marcados[i] ? "text-muted-foreground line-through" : "text-foreground"}>
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {qcOk ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
            <ShieldCheck className="size-4" />
            QC completo
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await marcarQC(ordenId, false);
                setMarcados(items.map(() => false));
              })
            }
          >
            <RotateCcw className="size-4" />
            Reabrir QC
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={todos ? "primary" : "outline"}
            size="sm"
            disabled={!todos || pending}
            onClick={() => start(async () => { await marcarQC(ordenId, true); })}
          >
            <ShieldCheck className="size-4" />
            {pending ? "…" : "Marcar QC completo"}
          </Button>
          {!todos ? (
            <span className="text-xs text-muted-foreground">
              Marca todos los puntos para cerrar el QC.
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
