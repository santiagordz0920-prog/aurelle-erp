import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PedidoControles } from "@/components/pedidos/pedido-controles";
import { PagoForm } from "@/components/pedidos/pago-form";
import { CandadoControl } from "@/components/pedidos/candado-control";
import { ReservarItem } from "@/components/pedidos/reservar-item";
import { LiberarItem } from "@/components/pedidos/liberar-item";
import { CostoForm } from "@/components/pedidos/costo-form";
import { EntregarBoton } from "@/components/pedidos/entregar-boton";
import { getPedido, itemsReservados } from "@/lib/data/pedidos";
import { ordenDePedido } from "@/lib/data/produccion";
import { CrearOrdenBtn } from "@/components/produccion/crear-orden-btn";
import { ETAPA_PRODUCCION } from "@/lib/produccion";
import { listarItems } from "@/lib/data/inventario";
import {
  ESTADO_PEDIDO,
  METODO_PAGO,
  TIPO_PAGO,
  puedeComprarMateriales,
  semaforo,
  type TipoPago,
} from "@/lib/pedidos";
import { ESTADO_ITEM, TIPO_ITEM, pesos } from "@/lib/inventario";
import { getUsuarioActual } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPedido(id);
  return { title: p ? `Pedido ${p.cliente_nombre ?? ""}`.trim() : "Pedido" };
}

function tipoSugerido(pagos: { tipo: TipoPago }[], saldo: number): TipoPago {
  const tiene = (t: TipoPago) => pagos.some((p) => p.tipo === t);
  if (!tiene("anticipo_1")) return "anticipo_1";
  if (!tiene("anticipo_2")) return "anticipo_2";
  return saldo > 0 ? "parcialidad" : "liquidacion";
}

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pedido, reservados, usuario, orden] = await Promise.all([
    getPedido(id),
    itemsReservados(id),
    getUsuarioActual(),
    ordenDePedido(id),
  ]);
  if (!pedido) notFound();
  const esAdmin = usuario.rol === "admin";

  const disponibles = await listarItems({ estado: "disponible" });
  const pagos = pedido.pagos ?? [];
  const pagado = pedido.pagado ?? 0;
  const saldo = pedido.saldo ?? pedido.total;
  const sem = semaforo(pedido.fecha_compromiso, pedido.estado);
  const liberado = puedeComprarMateriales(pedido);
  const cerrado = pedido.estado === "entregado" || pedido.estado === "cancelado";

  // Margen real (solo admin, si hay costo capturado).
  const costoReal = pedido.costo_real;
  const margenPct =
    esAdmin && costoReal != null && pedido.total > 0
      ? Math.round(((pedido.total - costoReal) / pedido.total) * 100)
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/ventas/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Pedidos
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {pedido.cliente_nombre ?? "Pedido sin cliente"}
            </h1>
            {sem.etiqueta !== "—" ? (
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${sem.clase}`}
              >
                {sem.etiqueta}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pesos(pedido.total)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span>
              Cobrado{" "}
              <span className="font-medium text-foreground">{pesos(pagado)}</span>
            </span>
            <span>
              · Saldo{" "}
              <span className={saldo > 0 ? "font-medium text-warning" : "font-medium text-success"}>
                {pesos(saldo)}
              </span>
            </span>
            {pedido.cotizacion_id ? (
              <Link
                href={`/ventas/cotizaciones/${pedido.cotizacion_id}`}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <FileText className="size-3.5" />
                Cotización
              </Link>
            ) : null}
            <Link
              href={`/imprimir/contrato/${pedido.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <FileText className="size-3.5" />
              Contrato
            </Link>
          </div>
        </div>
        {cerrado ? (
          <Badge className={ESTADO_PEDIDO[pedido.estado].clase}>
            {ESTADO_PEDIDO[pedido.estado].etiqueta}
          </Badge>
        ) : (
          <PedidoControles
            id={pedido.id}
            estado={pedido.estado}
            linea={pedido.linea_negocio}
          />
        )}
      </div>

      {/* Candado de anticipo 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Candado de compra de materiales</CardTitle>
        </CardHeader>
        <CardContent>
          <CandadoControl
            id={pedido.id}
            liberado={liberado}
            porOverride={pedido.override_candado}
            esAdmin={esAdmin}
          />
        </CardContent>
      </Card>

      {/* Plan de pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Plan de pagos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pagos.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {pagos.map((pg) => (
                <li
                  key={pg.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {TIPO_PAGO[pg.tipo]}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {METODO_PAGO[pg.metodo]} · {formatearFecha(pg.fecha)}
                    </span>
                    {pg.notas ? (
                      <p className="text-xs text-muted-foreground">{pg.notas}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">
                      {pesos(pg.monto)}
                    </span>
                    <Link
                      href={`/imprimir/recibo/${pedido.id}?p=${pg.id}`}
                      target="_blank"
                      className="text-xs text-accent hover:underline"
                    >
                      Recibo
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin pagos registrados. Empieza por el anticipo 1.
            </p>
          )}

          {!cerrado ? (
            <div className="border-t border-border pt-4">
              <PagoForm
                pedidoId={pedido.id}
                tipoSugerido={tipoSugerido(pagos, saldo)}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Reserva de inventario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Piezas reservadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reservados.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {reservados.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {it.nombre}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {it.sku} · {TIPO_ITEM[it.tipo]}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge className={ESTADO_ITEM[it.estado].clase}>
                      {ESTADO_ITEM[it.estado].etiqueta}
                    </Badge>
                    {!cerrado && it.estado === "reservado" ? (
                      <LiberarItem pedidoId={pedido.id} itemId={it.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay piezas reservadas para este pedido.
            </p>
          )}

          {!cerrado ? (
            <ReservarItem
              pedidoId={pedido.id}
              disponibles={disponibles.map((d) => ({
                id: d.id,
                etiqueta: `${d.sku} · ${d.nombre}`,
              }))}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Costo y margen real (solo admin) */}
      {esAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Costo y margen real <span className="text-muted-foreground">(solo admin)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Costo real</p>
                <p className="text-sm font-medium text-foreground">
                  {pesos(costoReal)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Utilidad</p>
                <p className="text-sm font-medium text-foreground">
                  {costoReal != null ? pesos(pedido.total - costoReal) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Margen {pedido.margen_sellado != null ? "(sellado)" : "real"}
                </p>
                <p className="text-sm font-semibold text-accent">
                  {pedido.margen_sellado != null
                    ? `${pedido.margen_sellado}%`
                    : margenPct != null
                      ? `${margenPct}%`
                      : "—"}
                </p>
              </div>
            </div>
            {pedido.margen_sellado == null ? (
              <div className="border-t border-border pt-4">
                <CostoForm pedidoId={pedido.id} costoActual={costoReal} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Producción */}
      {!cerrado ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Producción</p>
              <p className="text-xs text-muted-foreground">
                {orden
                  ? `En el taller · etapa ${ETAPA_PRODUCCION[orden.etapa].etiqueta}.`
                  : "Genera la orden para que Fer arranque el taller."}
              </p>
            </div>
            {orden ? (
              <Link
                href={`/taller/produccion/${orden.id}`}
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                Ver orden
              </Link>
            ) : (
              <CrearOrdenBtn pedidoId={pedido.id} />
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Entrega */}
      {!cerrado ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Entregar el pedido
              </p>
              <p className="text-xs text-muted-foreground">
                Sella el margen real y cierra el ciclo (garantía y aniversarios en Postventa).
              </p>
            </div>
            <EntregarBoton id={pedido.id} />
          </CardContent>
        </Card>
      ) : pedido.entregado_at ? (
        <p className="text-sm text-muted-foreground">
          Entregado el {formatearFecha(pedido.entregado_at.slice(0, 10))}.
        </p>
      ) : null}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
