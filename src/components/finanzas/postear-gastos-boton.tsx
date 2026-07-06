"use client";

import { useState, useTransition } from "react";
import { CalendarCheck } from "lucide-react";
import { postearGastosDelMes } from "@/app/(app)/dinero/gastos/actions";
import { Button } from "@/components/ui/button";

export function PostearGastosBoton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await postearGastosDelMes();
            setMsg(
              r.ok
                ? r.posteados
                  ? `Posteados ${r.posteados} al ledger.`
                  : "Ya estaban posteados este mes."
                : (r.error ?? "Error"),
            );
          })
        }
      >
        <CalendarCheck className="size-4" />
        {pending ? "Posteando…" : "Postear este mes"}
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
