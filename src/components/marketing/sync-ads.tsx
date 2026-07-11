"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { sincronizarGastoMeta } from "@/app/(app)/crecimiento/actions";
import { Button } from "@/components/ui/button";

/*
  Botón "Sincronizar con Meta" (solo-admin, /crecimiento): trae el gasto por
  campaña del mes en curso + anterior desde la Marketing API ahora mismo
  (respaldo manual del cron diario /api/cron/ads).
*/
export function SyncAds() {
  const [pending, start] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sincronizar = () =>
    start(async () => {
      setMensaje(null);
      setError(null);
      const r = await sincronizarGastoMeta();
      if (r.ok) setMensaje(r.detalle ?? "Gasto sincronizado.");
      else setError(r.error ?? "No se pudo sincronizar.");
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" variant="outline" onClick={sincronizar} disabled={pending}>
        <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} />
        {pending ? "Sincronizando…" : "Sincronizar con Meta"}
      </Button>
      {mensaje ? <p className="text-xs text-muted-foreground">{mensaje}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
