"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  crearContactoUtil,
  eliminarContactoUtil,
  type ResultadoAccion,
} from "@/app/(app)/taller/contactos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TIPOS_CONTACTO_UTIL } from "@/lib/contactos-utiles";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar contacto"}
    </Button>
  );
}

export function ContactoUtilForm() {
  const [estado, action] = useActionState(crearContactoUtil, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Nuevo contacto
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" placeholder="Ej. Chuy Montajes" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Oficio</Label>
          <Select id="tipo" name="tipo" defaultValue="joyero">
            {TIPOS_CONTACTO_UTIL.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contacto">Contacto (opcional)</Label>
          <Input id="contacto" name="contacto" placeholder="Teléfono / WhatsApp / correo" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="especialidad">Especialidad (opcional)</Label>
          <Input id="especialidad" name="especialidad" placeholder="Ej. micropavé, cera perdida…" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tiempo_entrega">Tiempo de entrega (opcional)</Label>
          <Input id="tiempo_entrega" name="tiempo_entrega" placeholder="Ej. 3-5 días hábiles" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precio_estimado">Precio estimado (opcional)</Label>
          <Input id="precio_estimado" name="precio_estimado" placeholder="Ej. desde $800/pieza" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input id="notas" name="notas" placeholder="Cómo llegó, referencias, condiciones…" />
      </div>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Guardar />
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function BotonEliminar() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
      aria-label="Eliminar contacto"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

export function EliminarContactoForm({ id, nombre }: { id: string; nombre: string }) {
  const [estado, action] = useActionState(eliminarContactoUtil, inicial);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`¿Eliminar a "${nombre}" del directorio?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <BotonEliminar />
      {estado.error ? <p className="text-xs text-destructive">{estado.error}</p> : null}
    </form>
  );
}
