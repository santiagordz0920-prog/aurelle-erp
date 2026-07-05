"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { crearTarea, type ResultadoAccion } from "@/app/(app)/hoy/tareas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PRIORIDADES, PRIORIDAD_TAREA, type EntidadTarea } from "@/lib/tareas";

const inicial: ResultadoAccion = { ok: false };

function Guardar({ compacto }: { compacto: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size={compacto ? "sm" : "md"} disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar tarea"}
    </Button>
  );
}

/**
 * Formulario de alta de tarea. Si se pasa `entidad`, la tarea queda vinculada a
 * esa entidad (p.ej. desde la ficha de un cliente) y el formulario va compacto.
 */
export function TareaForm({
  usuarios,
  entidad,
}: {
  usuarios: { id: string; nombre: string }[];
  entidad?: { tipo: EntidadTarea; id: string };
}) {
  const [estado, action] = useActionState(crearTarea, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(!entidad);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  const compacto = !!entidad;

  if (compacto && !abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Nueva tarea
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      {entidad ? (
        <>
          <input type="hidden" name="entidad_tipo" value={entidad.tipo} />
          <input type="hidden" name="entidad_id" value={entidad.id} />
        </>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Tarea</Label>
        <Input
          id="titulo"
          name="titulo"
          placeholder="Ej. Llamar a Ana por el CAD"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="responsable_id">Responsable</Label>
          <Select id="responsable_id" name="responsable_id" defaultValue="">
            <option value="">Yo</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prioridad">Prioridad</Label>
          <Select id="prioridad" name="prioridad" defaultValue="media">
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {PRIORIDAD_TAREA[p].etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha_vencimiento">Vence</Label>
          <Input id="fecha_vencimiento" name="fecha_vencimiento" type="date" />
        </div>
      </div>

      {!compacto ? (
        <div className="space-y-1.5">
          <Label htmlFor="detalle">Detalle (opcional)</Label>
          <Input id="detalle" name="detalle" placeholder="Contexto de la tarea…" />
        </div>
      ) : null}

      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Guardar compacto={compacto} />
        {compacto ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAbierto(false)}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
