"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  crearProveedor,
  type ResultadoAccion,
} from "@/app/(app)/dinero/proveedores/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIAS_PROVEEDOR } from "@/lib/proveedores";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Guardando…" : "Agregar proveedor"}
    </Button>
  );
}

export function ProveedorForm() {
  const [estado, action] = useActionState(crearProveedor, inicial);
  const [abierto, setAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Plus className="size-4" />
        Nuevo proveedor
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
          <Input id="nombre" name="nombre" placeholder="Ej. Metales del Norte" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contacto">Contacto</Label>
          <Input id="contacto" name="contacto" placeholder="Correo / teléfono" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="categorias">Categorías (separadas por coma)</Label>
          <Input
            id="categorias"
            name="categorias"
            placeholder={CATEGORIAS_PROVEEDOR.slice(0, 3).join(", ")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="condiciones_pago">Condiciones de pago</Label>
          <Input id="condiciones_pago" name="condiciones_pago" placeholder="Contado / 30 días" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input id="notas" name="notas" placeholder="Tiempos de entrega, mínimos…" />
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
