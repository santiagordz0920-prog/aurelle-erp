"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  alternarRecurrente,
  eliminarRecurrente,
} from "@/app/(app)/hoy/tareas/recurrentes/actions";
import { Badge } from "@/components/ui/badge";
import { PRIORIDAD_TAREA } from "@/lib/tareas";
import { cadenciaTexto, type TareaRecurrente } from "@/lib/recurrentes";

export function RecurrenteRow({ r }: { r: TareaRecurrente }) {
  const [pending, start] = useTransition();

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-40">
        <p className={`font-medium ${r.activo ? "text-foreground" : "text-muted-foreground line-through"}`}>
          {r.titulo}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{cadenciaTexto(r.cadencia, r.dia)}</span>
          <Badge className={PRIORIDAD_TAREA[r.prioridad].clase}>{PRIORIDAD_TAREA[r.prioridad].etiqueta}</Badge>
          {r.responsable_nombre ? <span>· {r.responsable_nombre}</span> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={r.activo}
            disabled={pending}
            onChange={(e) => start(async () => { await alternarRecurrente(r.id, e.target.checked); })}
          />
          Activa
        </label>
        <button
          type="button"
          aria-label="Eliminar recurrente"
          disabled={pending}
          onClick={() => start(async () => { await eliminarRecurrente(r.id); })}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}
