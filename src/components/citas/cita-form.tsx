"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus } from "lucide-react";
import { agendarCita, type ResultadoAccion } from "@/app/(app)/clientes/citas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SALAS_CITA, SALA_CITA, TIPOS_CITA, TIPO_CITA, type TipoCita } from "@/lib/citas";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <CalendarPlus className="size-4" />
      {pending ? "Agendando…" : "Agendar cita"}
    </Button>
  );
}

export function CitaForm({
  clientes,
  cliente,
}: {
  clientes?: { id: string; nombre: string }[];
  cliente?: { id: string; nombre: string };
}) {
  const [estado, action] = useActionState(agendarCita, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <CalendarPlus className="size-4" />
        Agendar cita
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      {cliente ? (
        <input type="hidden" name="cliente_id" value={cliente.id} />
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select id="cliente_id" name="cliente_id" defaultValue="">
            <option value="" disabled>
              Elige un cliente…
            </option>
            {(clientes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue="primera_visita">
            {TIPOS_CITA.map((t: TipoCita) => (
              <option key={t} value={t}>
                {TIPO_CITA[t].etiqueta}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sala">Sala</Label>
          <Select id="sala" name="sala" defaultValue="piso_ventas">
            {SALAS_CITA.map((s) => (
              <option key={s} value={s}>
                {SALA_CITA[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cuando">Fecha y hora</Label>
          <Input id="cuando" name="cuando" type="datetime-local" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duracion_min">Duración (min)</Label>
          <Input
            id="duracion_min"
            name="duracion_min"
            type="number"
            min={15}
            max={480}
            step={15}
            defaultValue={60}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input id="notas" name="notas" placeholder="Trae a la pareja, revisar render…" />
      </div>

      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      <div className="flex items-center gap-2">
        <Guardar />
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
