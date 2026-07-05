"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Check, Trash2, Link2 } from "lucide-react";
import {
  cambiarEstadoTarea,
  eliminarTarea,
} from "@/app/(app)/hoy/tareas/actions";
import { Badge } from "@/components/ui/badge";
import {
  ENTIDAD_TAREA,
  PRIORIDAD_TAREA,
  vencimiento,
  type Tarea,
} from "@/lib/tareas";

export function TareaItem({
  tarea,
  ocultarEntidad = false,
}: {
  tarea: Tarea;
  ocultarEntidad?: boolean;
}) {
  const [pending, start] = useTransition();
  const hecha = tarea.estado === "hecha";
  const v = vencimiento(tarea.fecha_vencimiento, tarea.estado);
  const entidad =
    tarea.entidad_tipo && tarea.entidad_id
      ? ENTIDAD_TAREA[tarea.entidad_tipo]
      : null;
  const ruta = entidad && tarea.entidad_id ? entidad.ruta(tarea.entidad_id) : null;

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecha"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await cambiarEstadoTarea(tarea.id, hecha ? "pendiente" : "hecha");
          })
        }
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          hecha
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary"
        }`}
      >
        {hecha ? <Check className="size-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            hecha ? "text-muted-foreground line-through" : "text-foreground"
          }`}
        >
          {tarea.titulo}
        </p>
        {tarea.detalle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{tarea.detalle}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Badge className={PRIORIDAD_TAREA[tarea.prioridad].clase}>
            {PRIORIDAD_TAREA[tarea.prioridad].etiqueta}
          </Badge>
          {v.etiqueta ? <span className={v.clase}>{v.etiqueta}</span> : null}
          {tarea.responsable_nombre ? (
            <span className="text-muted-foreground">· {tarea.responsable_nombre}</span>
          ) : null}
          {!ocultarEntidad && entidad ? (
            ruta ? (
              <Link
                href={ruta}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <Link2 className="size-3" />
                {entidad.etiqueta}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Link2 className="size-3" />
                {entidad.etiqueta}
              </span>
            )
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-label="Eliminar tarea"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await eliminarTarea(tarea.id);
          })
        }
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
