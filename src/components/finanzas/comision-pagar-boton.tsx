"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { marcarPagadaComision } from "@/app/(app)/dinero/comisiones/actions";
import { Button } from "@/components/ui/button";

export function ComisionPagarBoton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => {
        await marcarPagadaComision(id);
      })}
    >
      <Check className="size-4" />
      {pending ? "…" : "Marcar pagada"}
    </Button>
  );
}
