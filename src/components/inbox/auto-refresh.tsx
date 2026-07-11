"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/*
  Refresco automático del Inbox (pedido de Fer 2026-07-11: "tengo que recargar
  la página para ver mensajes nuevos"). Reejecuta el Server Component cada
  `cadaMs` (solo con la pestaña visible) y al volver a ella. router.refresh()
  conserva el estado del cliente (scroll, texto a medio escribir en el
  compositor); no es un reload.
*/
export function AutoRefresh({ cadaMs = 7000 }: { cadaMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, cadaMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, cadaMs]);
  return null;
}
