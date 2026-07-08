"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subirMedia, type ResultadoMedia } from "@/app/(app)/taller/biblioteca/actions";
import { ETIQUETAS_MEDIA, TIPOS_MEDIA, TIPO_MEDIA, etiquetaBonita } from "@/lib/media";

/* Formulario de subida a la Biblioteca. Un archivo a la vez (móvil-first), con
   tipo y etiquetas para que aparezca en las galerías y filtros correctos. */
export function SubirMedia({
  pedidoId,
  clienteId,
}: {
  pedidoId?: string | null;
  clienteId?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState(
    async (_prev: ResultadoMedia | null, formData: FormData) => subirMedia(formData),
    null,
  );

  useEffect(() => {
    if (estado?.ok) formRef.current?.reset();
  }, [estado]);

  if (!abierto) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setAbierto(true)}>
        <Upload className="size-4" />
        Subir archivo
      </Button>
    );
  }

  return (
    <form ref={formRef} action={accion} className="space-y-3 rounded-lg border border-border p-4">
      {pedidoId ? <input type="hidden" name="pedido_id" value={pedidoId} /> : null}
      {clienteId ? <input type="hidden" name="cliente_id" value={clienteId} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Archivo</span>
          <input
            type="file"
            name="archivo"
            required
            accept="image/*,.pdf,.stl,.3dm,.zip"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
          <select
            name="tipo"
            defaultValue="foto_final"
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            {TIPOS_MEDIA.map((t) => (
              <option key={t} value={t}>
                {TIPO_MEDIA[t].etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">
          Etiquetas (opcional — alimentan la galería de marketing)
        </legend>
        <div className="space-y-2">
          {ETIQUETAS_MEDIA.map((g) => (
            <div key={g.grupo} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="w-14 shrink-0 text-xs text-muted-foreground">{g.grupo}</span>
              {g.opciones.map((op) => (
                <label key={op} className="inline-flex items-center gap-1 text-xs">
                  <input type="checkbox" name="etiquetas" value={op} className="size-3.5" />
                  {etiquetaBonita(op)}
                </label>
              ))}
            </div>
          ))}
        </div>
      </fieldset>

      {estado?.error ? <p className="text-sm text-destructive">{estado.error}</p> : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pendiente}>
          {pendiente ? "Subiendo…" : "Subir"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cerrar
        </Button>
      </div>
    </form>
  );
}
