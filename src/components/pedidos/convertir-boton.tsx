"use client";

import { useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { crearPedidoDesdeCotizacion } from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";

export function ConvertirBoton({ cotizacionId }: { cotizacionId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await crearPedidoDesdeCotizacion(cotizacionId);
            // Solo llega aquí si NO hubo redirect (error de validación).
            if (r && !r.ok) setError(r.error ?? "No se pudo convertir.");
          })
        }
      >
        <ShoppingBag className="size-4" />
        {pending ? "Convirtiendo…" : "Convertir a pedido"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
