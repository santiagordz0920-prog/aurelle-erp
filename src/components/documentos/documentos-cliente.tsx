import Link from "next/link";
import { FileText, PenLine, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ESTADO_DOCUMENTO, TIPO_DOCUMENTO, type Documento } from "@/lib/documentos";

/* Documentos archivados del cliente (contratos, notas), con su estado de firma.
   Vista de solo lectura para la ficha 360. */
export function DocumentosCliente({ documentos }: { documentos: Documento[] }) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {documentos.map((d) => (
        <li key={d.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span className="font-medium text-foreground">{TIPO_DOCUMENTO[d.tipo]}</span>
              {d.version > 1 ? (
                <span className="text-xs text-muted-foreground">v{d.version}</span>
              ) : null}
              <Badge className={ESTADO_DOCUMENTO[d.estado].clase}>
                {ESTADO_DOCUMENTO[d.estado].etiqueta}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {d.estado === "firmado" && d.firmado_por
                ? `Firmado por ${d.firmado_por} · ${fechaHora(d.firmado_at)}`
                : `Creado ${fechaHora(d.created_at)}`}
            </p>
            {typeof d.evidencia?.firma_trazo === "string" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.evidencia.firma_trazo}
                alt="Firma del cliente"
                className="mt-1.5 h-12 rounded border border-border bg-white"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            <Link
              href={`/ventas/pedidos/${d.pedido_id}`}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <ShoppingBag className="size-3.5" />
              Pedido
            </Link>
            {d.estado === "enviado" ? (
              <Link
                href={`/firmar/${d.token}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <PenLine className="size-3.5" />
                Liga de firma
              </Link>
            ) : null}
            <Link
              href={`/imprimir/contrato/${d.pedido_id}`}
              target="_blank"
              className="text-accent hover:underline"
            >
              Imprimir
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

function fechaHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Monterrey",
  });
}
