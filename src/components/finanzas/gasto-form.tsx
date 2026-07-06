"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  crearGastoRecurrente,
  type ResultadoAccion,
} from "@/app/(app)/dinero/gastos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : "Agregar gasto"}
    </Button>
  );
}

export function GastoForm() {
  const [estado, action] = useActionState(crearGastoRecurrente, inicial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok) ref.current?.reset();
  }, [estado]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <Input name="concepto" placeholder="Concepto (ej. Renta Ellion)" required />
      <div className="flex flex-wrap gap-2">
        <Input name="monto" inputMode="numeric" placeholder="Monto" className="w-32 flex-none" required />
        <Input name="categoria" placeholder="Categoría" className="w-36 flex-none" />
        <Input
          name="dia_cargo"
          inputMode="numeric"
          placeholder="Día (1-28)"
          className="w-28 flex-none"
        />
        <Guardar />
      </div>
      <p className="text-xs text-muted-foreground">
        Periodicidad mensual. Se postea solo al ledger cada mes.
      </p>
      {estado.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}
    </form>
  );
}
