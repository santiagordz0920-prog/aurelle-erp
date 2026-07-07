"use client";

import { useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { marcarQC } from "@/app/(app)/taller/produccion/actions";
import { Button } from "@/components/ui/button";

export function QcToggle({ ordenId, qcOk }: { ordenId: string; qcOk: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={qcOk ? "primary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await marcarQC(ordenId, !qcOk); })}
    >
      <ShieldCheck className="size-4" />
      {pending ? "…" : qcOk ? "QC completo" : "Marcar QC completo"}
    </Button>
  );
}
