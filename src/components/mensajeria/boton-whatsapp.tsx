"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkWhatsApp } from "@/lib/mensajes";

/*
  Botón de envío asistido: abre WhatsApp con un mensaje pre-llenado; lo envía la
  persona (sin bridges, cero riesgo de ban). Reusable en pedido/cita/ficha.
*/
export function BotonWhatsApp({
  telefono,
  texto,
  etiqueta = "WhatsApp",
  size = "sm",
}: {
  telefono: string | null;
  texto: string;
  etiqueta?: string;
  size?: "sm" | "md";
}) {
  const link = telefono ? linkWhatsApp(telefono, texto) : null;
  if (!link) return null;
  return (
    <Button asChild variant="outline" size={size}>
      <a href={link} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        {etiqueta}
      </a>
    </Button>
  );
}
