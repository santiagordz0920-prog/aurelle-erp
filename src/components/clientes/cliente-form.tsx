"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { crearCliente, type ResultadoAccion } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CANAL_FUENTE } from "@/lib/clientes";

const estadoInicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cliente"}
    </Button>
  );
}

export function ClienteForm() {
  const [estado, action] = useActionState(crearCliente, estadoInicial);

  return (
    <form action={action} className="space-y-5">
      <Campo label="Nombre" htmlFor="nombre" requerido>
        <Input id="nombre" name="nombre" required placeholder="Ana López" />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Teléfono (WhatsApp)" htmlFor="telefono">
          <Input
            id="telefono"
            name="telefono"
            inputMode="tel"
            placeholder="+52 81 1234 5678"
          />
        </Campo>
        <Campo label="Nombre de la pareja" htmlFor="pareja_nombre">
          <Input id="pareja_nombre" name="pareja_nombre" placeholder="Diego" />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Fecha de boda" htmlFor="fecha_boda">
          <Input id="fecha_boda" name="fecha_boda" type="date" />
        </Campo>
        <Campo label="Fecha de nacimiento" htmlFor="fecha_nacimiento">
          <Input id="fecha_nacimiento" name="fecha_nacimiento" type="date" />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo label="Fuente" htmlFor="fuente_canal">
          <Select id="fuente_canal" name="fuente_canal" defaultValue="">
            <option value="">Sin especificar</option>
            {Object.entries(CANAL_FUENTE).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo
          label="Detalle de fuente"
          htmlFor="fuente_detalle"
          ayuda="Ej. Fase 1 SPGG, nombre de expo, quién refirió"
        >
          <Input
            id="fuente_detalle"
            name="fuente_detalle"
            placeholder="Fase 1 · SPGG"
          />
        </Campo>
      </div>

      <Campo
        label="Etiquetas"
        htmlFor="etiquetas"
        ayuda="Separadas por coma. Ej. 2ct+, vip"
      >
        <Input id="etiquetas" name="etiquetas" placeholder="2ct+, vip" />
      </Campo>

      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Guardar />
        <Button asChild variant="ghost">
          <Link href="/clientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

function Campo({
  label,
  htmlFor,
  ayuda,
  requerido,
  children,
}: {
  label: string;
  htmlFor: string;
  ayuda?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {requerido ? <span className="ml-0.5 text-accent">*</span> : null}
      </Label>
      {children}
      {ayuda ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
    </div>
  );
}
