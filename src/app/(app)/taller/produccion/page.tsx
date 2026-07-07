import Link from "next/link";
import { ArrowLeft, Hammer, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { AvanzarBtn } from "@/components/produccion/avanzar-btn";
import { listarOrdenes } from "@/lib/data/produccion";
import { ETAPAS_PRODUCCION, ETAPA_PRODUCCION, type OrdenProduccion } from "@/lib/produccion";
import { LINEA_NEGOCIO } from "@/lib/pedidos";

export const metadata = { title: "Producción" };

const ATASCO_DIAS = 7;

export default async function ProduccionPage() {
  const ordenes = await listarOrdenes();

  const porEtapa = new Map<string, OrdenProduccion[]>();
  for (const e of ETAPAS_PRODUCCION) porEtapa.set(e, []);
  for (const o of ordenes) porEtapa.get(o.etapa)?.push(o);

  return (
    <div className="space-y-5">
      <Link
        href="/taller"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Taller
      </Link>

      <PageHeader
        titulo="Producción"
        descripcion="El taller de un vistazo. Mueve de etapa en dos toques; los costos alimentan el margen del pedido."
      />

      {ordenes.length === 0 ? (
        <EmptyState
          icono={Hammer}
          titulo="Sin órdenes de producción"
          descripcion="Crea una orden desde un pedido confirmado (botón “Crear orden de producción” en el pedido)."
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ETAPAS_PRODUCCION.map((etapa) => {
            const cards = porEtapa.get(etapa) ?? [];
            return (
              <div key={etapa} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-medium text-foreground">
                    {ETAPA_PRODUCCION[etapa].etiqueta}
                  </span>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((o) => {
                    const atasco = (o.dias_en_etapa ?? 0) >= ATASCO_DIAS;
                    return (
                      <div
                        key={o.id}
                        className="rounded-lg border border-border bg-card p-3"
                      >
                        <Link
                          href={`/taller/produccion/${o.id}`}
                          className="block font-medium text-foreground hover:underline"
                        >
                          {o.pedido_cliente ?? "Pedido"}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {o.linea_negocio ? (
                            <span>{LINEA_NEGOCIO[o.linea_negocio as "bridal" | "concierge"]}</span>
                          ) : null}
                          {o.responsable_nombre ? <span>· {o.responsable_nombre}</span> : null}
                          <span
                            className={`inline-flex items-center gap-1 ${
                              atasco ? "text-destructive" : ""
                            }`}
                          >
                            {atasco ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
                            {o.dias_en_etapa}d
                          </span>
                          {o.qc_ok ? (
                            <Badge className="bg-success/15 text-success">QC ✓</Badge>
                          ) : null}
                        </div>
                        <div className="mt-2">
                          <AvanzarBtn ordenId={o.id} etapa={o.etapa} qcOk={o.qc_ok} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
