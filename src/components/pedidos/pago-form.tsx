"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  registrarPago,
  type ResultadoAccion,
} from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { METODO_PAGO, TIPO_PAGO, type TipoPago } from "@/lib/pedidos";

const inicial: ResultadoAccion = { ok: false };

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Registrando…" : "Registrar pago"}
    </Button>
  );
}

export function PagoForm({
  pedidoId,
  tipoSugerido,
}: {
  pedidoId: string;
  tipoSugerido: TipoPago;
}) {
  const [estado, action] = useActionState(registrarPago, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="pedido_id" value={pedidoId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="monto">Monto (MXN)</Label>
          <Input
            id="monto"
            name="monto"
            inputMode="numeric"
            placeholder="45000"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metodo">Método</Label>
          <Select id="metodo" name="metodo" defaultValue="transferencia">
            {(Object.keys(METODO_PAGO) as (keyof typeof METODO_PAGO)[]).map((m) => (
              <option key={m} value={m}>
                {METODO_PAGO[m]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo</Label>
          <Select id="tipo" name="tipo" defaultValue={tipoSugerido}>
            {(Object.keys(TIPO_PAGO) as TipoPago[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_PAGO[t]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notas">Notas (opcional)</Label>
        <Input id="notas" name="notas" placeholder="Referencia, banco…" />
      </div>
      {estado.error ? (
        <p className="text-sm text-destructive">{estado.error}</p>
      ) : null}
      <Guardar />
    </form>
  );
}
