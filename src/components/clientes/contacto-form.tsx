"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarContacto, type ResultadoAccion } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { METODO_CONTACTO, type Cliente, type MetodoContacto } from "@/lib/clientes";

/*
  Edición de los datos de contacto desde la ficha (intake multicanal):
  teléfono, correo, Instagram, Messenger y otro, más el método PREFERIDO — el
  que se muestra como principal en el CRM; los demás solo quedan registrados.
*/

const estadoInicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar contacto"}
    </Button>
  );
}

export function ContactoForm({ cliente }: { cliente: Cliente }) {
  const [estado, action] = useActionState(actualizarContacto, estadoInicial);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-border bg-card p-4"
    >
      <div>
        <h3 className="text-sm font-medium text-foreground">Datos de contacto</h3>
        <p className="text-xs text-muted-foreground">
          Mínimo uno. El preferido es el que se muestra en la lista de leads.
        </p>
      </div>
      <input type="hidden" name="cliente_id" value={cliente.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ct-telefono">Teléfono (WhatsApp)</Label>
          <Input
            id="ct-telefono"
            name="telefono"
            inputMode="tel"
            defaultValue={cliente.telefono ?? ""}
            placeholder="+52 81 1234 5678"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-correo">Correo</Label>
          <Input
            id="ct-correo"
            name="correo"
            type="email"
            defaultValue={cliente.correo ?? ""}
            placeholder="ana@correo.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-instagram">Instagram</Label>
          <Input
            id="ct-instagram"
            name="instagram"
            defaultValue={cliente.instagram ?? ""}
            placeholder="@usuario"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-facebook">Messenger / Facebook</Label>
          <Input
            id="ct-facebook"
            name="facebook"
            defaultValue={cliente.facebook ?? ""}
            placeholder="Nombre de perfil"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-otro">Otro contacto</Label>
          <Input
            id="ct-otro"
            name="otro_contacto"
            defaultValue={cliente.otro_contacto ?? ""}
            placeholder="Ej. teléfono de la oficina, Telegram"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-preferido">Contacto preferido</Label>
          <Select
            id="ct-preferido"
            name="contacto_preferido"
            defaultValue={cliente.contacto_preferido ?? ""}
          >
            <option value="">Automático (el primero con dato)</option>
            {(Object.keys(METODO_CONTACTO) as MetodoContacto[]).map((m) => (
              <option key={m} value={m}>
                {METODO_CONTACTO[m]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : estado.ok ? (
        <p className="text-sm text-muted-foreground">Contacto actualizado.</p>
      ) : null}
      <Guardar />
    </form>
  );
}
