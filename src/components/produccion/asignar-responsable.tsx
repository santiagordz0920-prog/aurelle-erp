"use client";

import { useTransition } from "react";
import { UserRound } from "lucide-react";
import { asignarResponsable } from "@/app/(app)/taller/produccion/actions";
import type { UsuarioLite } from "@/lib/data/usuarios";

/* Selector de responsable del taller para una orden. Guarda al cambiar. */
export function AsignarResponsable({
  ordenId,
  responsableId,
  usuarios,
}: {
  ordenId: string;
  responsableId: string | null;
  usuarios: UsuarioLite[];
}) {
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <UserRound className="size-4" />
      <span className="sr-only">Responsable</span>
      <select
        defaultValue={responsableId ?? ""}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await asignarResponsable(ordenId, e.target.value || null);
          })
        }
        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
      >
        <option value="">Sin asignar</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
