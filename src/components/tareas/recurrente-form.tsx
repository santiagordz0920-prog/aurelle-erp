"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { crearRecurrente, type ResultadoAccion } from "@/app/(app)/hoy/tareas/recurrentes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PRIORIDADES, PRIORIDAD_TAREA } from "@/lib/tareas";
import { DIAS_SEMANA } from "@/lib/recurrentes";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar recurrente"}
    </Button>
  );
}

export function RecurrenteForm({ usuarios }: { usuarios: { id: string; nombre: string }[] }) {
  const [estado, action] = useActionState(crearRecurrente, inicial);
  const [cadencia, setCadencia] = useState<"semanal" | "mensual">("mensual");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" name="titulo" placeholder="Conteo de vitrinas…" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="detalle">Detalle (opcional)</Label>
          <Input id="detalle" name="detalle" placeholder="Cruzar contra inventario…" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="cadencia">Cadencia</Label>
          <Select
            id="cadencia"
            name="cadencia"
            value={cadencia}
            onChange={(e) => setCadencia(e.target.value as "semanal" | "mensual")}
          >
            <option value="mensual">Cada mes</option>
            <option value="semanal">Cada semana</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dia">{cadencia === "semanal" ? "Día de la semana" : "Día del mes"}</Label>
          {cadencia === "semanal" ? (
            <Select id="dia" name="dia" defaultValue="1">
              {DIAS_SEMANA.map((n, i) => (
                <option key={n} value={i + 1}>
                  {n}
                </option>
              ))}
            </Select>
          ) : (
            <Input id="dia" name="dia" type="number" min={1} max={28} defaultValue={1} />
          )}
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
          <Label htmlFor="responsable_id">Responsable</Label>
          <Select id="responsable_id" name="responsable_id" defaultValue="">
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Guardar />
        {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      </div>
    </form>
  );
}
