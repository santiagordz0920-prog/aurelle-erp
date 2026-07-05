"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { marcarPagadaCxP } from "@/app/(app)/dinero/actions";
import { Button } from "@/components/ui/button";

export function CxpPagarBoton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await marcarPagadaCxP(id);
        })
      }
    >
      <Check className="size-4" />
      {pending ? "…" : "Marcar pagada"}
    </Button>
  );
}
