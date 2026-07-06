"use client";

import { useState } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { PLANTILLAS_MENSAJE, linkWhatsApp } from "@/lib/mensajes";

export function EnviarWhatsApp({
  nombre,
  pareja,
  telefono,
}: {
  nombre: string;
  pareja?: string | null;
  telefono: string | null;
}) {
  const ctx = { nombre, pareja };
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS_MENSAJE[0].id);
  const [texto, setTexto] = useState(PLANTILLAS_MENSAJE[0].cuerpo(ctx));

  if (!telefono) {
    return (
      <EmptyState
        icono={MessageCircle}
        titulo="Sin teléfono"
        descripcion="Agrega el teléfono del cliente para poder escribirle por WhatsApp."
        className="border-0 bg-transparent py-8"
      />
    );
  }

  const link = linkWhatsApp(telefono, texto);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Elige una plantilla o escribe libre; se abre WhatsApp con el mensaje listo y tú
        le das enviar. (El inbox de 2 vías llega cuando el riel oficial esté activo.)
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="plantilla">Plantilla</Label>
        <Select
          id="plantilla"
          value={plantillaId}
          onChange={(e) => {
            const p = PLANTILLAS_MENSAJE.find((x) => x.id === e.target.value);
            if (p) {
              setPlantillaId(p.id);
              setTexto(p.cuerpo(ctx));
            }
          }}
        >
          {PLANTILLAS_MENSAJE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.etiqueta}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="texto">Mensaje</Label>
        <Textarea
          id="texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          placeholder="Escribe tu mensaje…"
        />
      </div>

      <Button asChild disabled={!link || !texto.trim()}>
        <a href={link ?? "#"} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="size-4" />
          Abrir en WhatsApp
        </a>
      </Button>
    </div>
  );
}
