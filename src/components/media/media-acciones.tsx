"use client";

import { useTransition } from "react";
import { Check, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alternarAprobado, eliminarMedia } from "@/app/(app)/taller/biblioteca/actions";
import type { TipoMedia } from "@/lib/media";

/* Acciones de una pieza de media: aprobar render y eliminar. */
export function MediaAcciones({
  id,
  tipo,
  aprobado,
  pedidoId,
}: {
  id: string;
  tipo: TipoMedia;
  aprobado: boolean;
  pedidoId?: string | null;
}) {
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      {tipo === "render" ? (
        <Button
          type="button"
          variant={aprobado ? "accent" : "outline"}
          size="sm"
          disabled={pendiente}
          onClick={() =>
            startTransition(async () => {
              // pedido_id/tipo se leen server-side de la fila (no se mandan del navegador).
              await alternarAprobado(id, !aprobado);
            })
          }
          title={aprobado ? "Quitar aprobación" : "Marcar como aprobado por el cliente"}
        >
          {aprobado ? <CheckCircle2 className="size-4" /> : <Check className="size-4" />}
          {aprobado ? "Aprobado" : "Aprobar"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pendiente}
        onClick={() => {
          if (!confirm("¿Eliminar este archivo? No se puede deshacer.")) return;
          startTransition(async () => {
            await eliminarMedia(id, pedidoId);
          });
        }}
        title="Eliminar"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
