"use client";

import { useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { entregarPedido } from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";

export function EntregarBoton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await entregarPedido(id);
        })
      }
    >
      <PackageCheck className="size-4" />
      {pending ? "Entregando…" : "Marcar como entregado"}
    </Button>
  );
}
