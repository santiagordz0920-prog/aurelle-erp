"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { liberarItem } from "@/app/(app)/ventas/pedidos/actions";
import { Button } from "@/components/ui/button";

export function LiberarItem({
  pedidoId,
  itemId,
}: {
  pedidoId: string;
  itemId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Liberar item"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await liberarItem(pedidoId, itemId);
        })
      }
    >
      <X className="size-4 text-muted-foreground" />
    </Button>
  );
}
