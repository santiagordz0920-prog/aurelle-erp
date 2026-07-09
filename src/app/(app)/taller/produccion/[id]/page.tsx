import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShoppingBag, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvanzarBtn } from "@/components/produccion/avanzar-btn";
import { QcChecklist } from "@/components/produccion/qc-checklist";
import { AsignarResponsable } from "@/components/produccion/asignar-responsable";
import { CrearTareaAtasco } from "@/components/produccion/crear-tarea-atasco";
import { CostoProdForm } from "@/components/produccion/costo-prod-form";
import { ConsumirMaterial } from "@/components/produccion/consumir-material";
import { MediaPedido } from "@/components/media/media-pedido";
import { SlidersHorizontal, Gem } from "lucide-react";
import { getOrden, checklistDeLinea } from "@/lib/data/produccion";
import { itemsReservados } from "@/lib/data/pedidos";
import { listarUsuarios } from "@/lib/data/usuarios";
import { getUsuarioActual } from "@/lib/session";
import {
  ATASCO_DIAS,
  ETAPA_PRODUCCION,
  TIPO_COSTO_PROD,
  diasEnEtapa,
} from "@/lib/produccion";
import { pesos, ESTADO_ITEM } from "@/lib/inventario";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOrden(id);
  return { title: o ? `Producción ${o.pedido_cliente ?? ""}`.trim() : "Producción" };
}

export default async function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [orden, usuarios, usuario] = await Promise.all([
    getOrden(id),
    listarUsuarios(),
    getUsuarioActual(),
  ]);
  if (!orden) notFound();
  const materiales = await itemsReservados(orden.pedido_id);
  const costos = orden.costos ?? [];
  const dias = orden.dias_en_etapa ?? diasEnEtapa(orden.updated_at);
  const atascada = dias >= ATASCO_DIAS && orden.etapa !== "listo_entrega";
  const checklistQc = await checklistDeLinea(orden.linea_negocio);
  const esAdmin = usuario.rol === "admin";

  return (
    <div className="space-y-5">
      <Link
        href="/taller/produccion"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Producción
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {orden.pedido_cliente ?? "Orden de producción"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge className={ETAPA_PRODUCCION[orden.etapa].clase}>
              {ETAPA_PRODUCCION[orden.etapa].etiqueta}
            </Badge>
            {orden.fecha_compromiso ? (
              <span>· compromiso {formatearFecha(orden.fecha_compromiso)}</span>
            ) : null}
            <Link
              href={`/ventas/pedidos/${orden.pedido_id}`}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <ShoppingBag className="size-3.5" />
              Pedido
            </Link>
          </div>
        </div>
        <AsignarResponsable
          ordenId={orden.id}
          responsableId={orden.responsable_id}
          usuarios={usuarios}
        />
      </div>

      {/* Alerta de atasco → levantar tarea de seguimiento */}
      {atascada ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 text-sm text-foreground">
              <AlertTriangle className="size-4 text-warning" />
              Lleva <span className="font-semibold">{dias} días</span> en “
              {ETAPA_PRODUCCION[orden.etapa].etiqueta}”. ¿Está atorada?
            </p>
            <CrearTareaAtasco ordenId={orden.id} />
          </CardContent>
        </Card>
      ) : null}

      {/* Etapa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Etapa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <AvanzarBtn ordenId={orden.id} etapa={orden.etapa} qcOk={orden.qc_ok} size="md" />
          {orden.etapa === "qc" && !orden.qc_ok ? (
            <span className="text-xs text-warning">
              Completa el QC (abajo) para poder marcar “listo para entrega”.
            </span>
          ) : null}
        </CardContent>
      </Card>

      {/* Control de calidad (checklist por tipo de pieza) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Control de calidad</CardTitle>
          {esAdmin ? (
            <Link
              href="/taller/produccion/qc"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5" />
              Editar checklist
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          <QcChecklist ordenId={orden.id} qcOk={orden.qc_ok} items={checklistQc} />
        </CardContent>
      </Card>

      {/* Costos de producción */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Costos de producción</CardTitle>
          <span className="text-sm font-semibold text-foreground">
            {pesos(orden.costo_total ?? 0)}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          {costos.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {costos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{c.concepto}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {TIPO_COSTO_PROD[c.tipo]}
                    </span>
                  </span>
                  <span className="font-medium text-foreground">{pesos(c.monto)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin costos capturados. Se suman al costo real del pedido (y a su margen).
            </p>
          )}
          <div className="border-t border-border pt-4">
            <CostoProdForm ordenId={orden.id} />
          </div>
        </CardContent>
      </Card>

      {/* Materiales del pedido (inventario reservado → consumo en producción) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Materiales del pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {materiales.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {materiales.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Gem className="size-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium text-foreground">{m.nombre}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{m.sku}</span>
                    </span>
                    <Badge className={ESTADO_ITEM[m.estado].clase}>{ESTADO_ITEM[m.estado].etiqueta}</Badge>
                  </span>
                  {m.estado === "reservado" ? (
                    <ConsumirMaterial itemId={m.id} pedidoId={orden.pedido_id} ordenId={orden.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin materiales reservados. Resérvalos desde el pedido; al usarlos en la pieza, márcalos
              consumidos aquí y su costo entra al costo real del pedido.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Fotos de la pieza (van a la Biblioteca del pedido) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fotos y archivos de la pieza</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaPedido
            pedidoId={orden.pedido_id}
            ordenId={orden.id}
            etapa={orden.etapa}
          />
        </CardContent>
      </Card>

      {orden.notas ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-1 text-sm text-foreground">{orden.notas}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
