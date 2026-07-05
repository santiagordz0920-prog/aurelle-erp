"use client";

import { useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { overrideCandado } from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";

export function CandadoControl({
  id,
  liberado,
  porOverride,
  esAdmin,
}: {
  id: string;
  liberado: boolean;
  porOverride: boolean;
  esAdmin: boolean;
}) {
  const [pending, start] = useTransition();

  if (liberado) {
    return (
      <div className="flex items-center gap-2 text-sm text-success">
        <LockOpen className="size-4" />
        <span>
          Compra de materiales habilitada
          {porOverride ? " (liberado manualmente por admin)" : " (anticipo 2 registrado)"}.
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-warning">
        <Lock className="size-4" />
        <span>
          Bloqueado: no se pueden comprar materiales hasta registrar el anticipo 2 (30%).
        </span>
      </div>
      {esAdmin ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await overrideCandado(id);
            })
          }
        >
          <LockOpen className="size-4" />
          {pending ? "Liberando…" : "Liberar candado (queda auditado)"}
        </Button>
      ) : null}
    </div>
  );
}
