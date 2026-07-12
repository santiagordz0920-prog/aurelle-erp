"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Phone, Clock, BadgeDollarSign, Pencil, Trash2, Plus } from "lucide-react";
import {
  guardarContactoUtil,
  eliminarContactoUtil,
  type ResultadoContacto,
} from "@/app/(app)/taller/contactos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  TIPOS_CONTACTO_UTIL,
  TIPO_CONTACTO_ETIQUETA,
  type ContactoUtil,
} from "@/lib/contactos-utiles";

/*
  UI de Contactos del gremio: un mismo form sirve para alta y edición (id
  oculto); cada tarjeta se edita en su lugar. Nada obligatorio salvo el nombre.
*/

const estadoInicial: ResultadoContacto = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

export function ContactoUtilForm({
  contacto,
  alCerrar,
}: {
  contacto?: ContactoUtil;
  alCerrar?: () => void;
}) {
  const [estado, action] = useActionState(
    async (prev: ResultadoContacto, fd: FormData) => {
      const res = await guardarContactoUtil(prev, fd);
      if (res.ok) alCerrar?.();
      return res;
    },
    estadoInicial,
  );

  return (
    <form
      action={action}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      {contacto ? <input type="hidden" name="id" value={contacto.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cu-nombre">
            Nombre<span className="ml-0.5 text-accent">*</span>
          </Label>
          <Input
            id="cu-nombre"
            name="nombre"
            required
            defaultValue={contacto?.nombre ?? ""}
            placeholder="Don Chuy"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-tipo">Oficio</Label>
          <Select id="cu-tipo" name="tipo" defaultValue={contacto?.tipo ?? ""}>
            <option value="">Sin clasificar</option>
            {TIPOS_CONTACTO_UTIL.map((t) => (
              <option key={t} value={t}>
                {TIPO_CONTACTO_ETIQUETA[t].replace(/s$/, "")}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-contacto">Contacto</Label>
          <Input
            id="cu-contacto"
            name="contacto"
            defaultValue={contacto?.contacto ?? ""}
            placeholder="Teléfono, WhatsApp o correo"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-especialidad">Especialidad</Label>
          <Input
            id="cu-especialidad"
            name="especialidad"
            defaultValue={contacto?.especialidad ?? ""}
            placeholder="Vaciado en platino, pavé fino…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-tiempo">Tiempo de entrega</Label>
          <Input
            id="cu-tiempo"
            name="tiempo_entrega"
            defaultValue={contacto?.tiempo_entrega ?? ""}
            placeholder="3-5 días hábiles"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cu-precios">Precios estimados</Label>
          <Input
            id="cu-precios"
            name="precios_estimados"
            defaultValue={contacto?.precios_estimados ?? ""}
            placeholder="$800-1,200 por montada"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cu-notas">Notas</Label>
        <Input
          id="cu-notas"
          name="notas"
          defaultValue={contacto?.notas ?? ""}
          placeholder="Referencias, cómo trabaja, quién lo recomendó…"
        />
      </div>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
      <div className="flex items-center gap-2">
        <Guardar />
        {alCerrar ? (
          <Button type="button" variant="ghost" size="sm" onClick={alCerrar}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Botón "Agregar contacto" que despliega el form de alta. */
export function NuevoContactoUtil() {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Agregar contacto
      </Button>
    );
  }
  return <ContactoUtilForm alCerrar={() => setAbierto(false)} />;
}

/** Tarjeta de contacto con edición en su lugar y borrado con confirmación. */
export function ContactoUtilItem({ contacto }: { contacto: ContactoUtil }) {
  const [editando, setEditando] = useState(false);
  const [pending, start] = useTransition();

  if (editando) {
    return (
      <li className="px-4 py-3">
        <ContactoUtilForm contacto={contacto} alCerrar={() => setEditando(false)} />
      </li>
    );
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{contacto.nombre}</p>
          {contacto.especialidad ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {contacto.especialidad}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {contacto.contacto ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {contacto.contacto}
              </span>
            ) : null}
            {contacto.tiempo_entrega ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {contacto.tiempo_entrega}
              </span>
            ) : null}
            {contacto.precios_estimados ? (
              <span className="inline-flex items-center gap-1">
                <BadgeDollarSign className="size-3" />
                {contacto.precios_estimados}
              </span>
            ) : null}
          </div>
          {contacto.notas ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{contacto.notas}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Editar contacto"
            onClick={() => setEditando(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Eliminar contacto"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`¿Eliminar a "${contacto.nombre}" del directorio?`)) {
                start(async () => {
                  await eliminarContactoUtil(contacto.id);
                });
              }
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>
    </li>
  );
}
