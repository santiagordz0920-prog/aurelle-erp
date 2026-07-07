"use client";

import { useState, useTransition } from "react";
import { FileSignature, Copy, ExternalLink, Check } from "lucide-react";
import {
  generarContrato,
  cancelarDocumento,
} from "@/app/(app)/ventas/pedidos/documentos-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ESTADO_DOCUMENTO, TIPO_DOCUMENTO, type Documento } from "@/lib/documentos";

function ligaFirma(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/firmar/${token}`;
}

function CopiarLiga({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(ligaFirma(token));
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          /* no-op */
        }
      }}
    >
      {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copiado ? "Copiada" : "Copiar liga"}
    </button>
  );
}

export function DocumentosPedido({
  pedidoId,
  documentos,
}: {
  pedidoId: string;
  documentos: Documento[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {documentos.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {documentos.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {TIPO_DOCUMENTO[d.tipo]}
                  <Badge className={ESTADO_DOCUMENTO[d.estado].clase}>
                    {ESTADO_DOCUMENTO[d.estado].etiqueta}
                  </Badge>
                </p>
                {d.estado === "firmado" ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Firmado por {d.firmado_por}
                    {d.firmado_at
                      ? ` · ${new Date(d.firmado_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </p>
                ) : null}
              </div>
              {d.estado !== "cancelado" && d.estado !== "firmado" ? (
                <div className="flex items-center gap-3">
                  <CopiarLiga token={d.token} />
                  <a
                    href={`/firmar/${d.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Abrir
                  </a>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => start(async () => { await cancelarDocumento(d.id, pedidoId); })}
                  >
                    Cancelar
                  </button>
                </div>
              ) : d.estado === "firmado" ? (
                <a
                  href={`/firmar/${d.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  Ver firmado
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col items-start gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await generarContrato(pedidoId);
              setError(r.ok ? null : (r.error ?? "No se pudo generar."));
            })
          }
        >
          <FileSignature className="size-4" />
          {pending ? "Generando…" : "Generar contrato para firma"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Crea una liga de firma; compártela por WhatsApp (desde la ficha) y el cliente firma sin cuenta.
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
