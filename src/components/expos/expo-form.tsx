"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { crearExpo, type ResultadoAccion } from "@/app/(app)/crecimiento/expos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ESTADOS_EXPO, ESTADO_EXPO } from "@/lib/expos";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar expo"}
    </Button>
  );
}

export function ExpoForm() {
  const [estado, action] = useActionState(crearExpo, inicial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" placeholder="Expo Novias Monterrey" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input id="ciudad" name="ciudad" placeholder="Monterrey" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" name="estado" defaultValue="candidata">
            {ESTADOS_EXPO.map((e) => (
              <option key={e} value={e}>
                {ESTADO_EXPO[e].etiqueta}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="fecha_inicio">Del</Label>
          <Input id="fecha_inicio" name="fecha_inicio" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fecha_fin">Al</Label>
          <Input id="fecha_fin" name="fecha_fin" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="costo">Costo total (MXN)</Label>
          <Input id="costo" name="costo" inputMode="numeric" defaultValue="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contacto">Contacto</Label>
          <Input id="contacto" name="contacto" placeholder="Organizador…" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Guardar />
        {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      </div>
    </form>
  );
}
