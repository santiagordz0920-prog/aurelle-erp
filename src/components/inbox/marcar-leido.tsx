"use client";

import { useEffect, useRef } from "react";
import { marcarLeido } from "@/app/(app)/clientes/inbox/actions";

/* Marca la conversación como leída al abrir el hilo (una sola vez). */
export function MarcarLeidoAlAbrir({ conversacionId }: { conversacionId: string }) {
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    void marcarLeido(conversacionId);
  }, [conversacionId]);
  return null;
}
