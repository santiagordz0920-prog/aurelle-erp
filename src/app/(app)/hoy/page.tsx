import Link from "next/link";
import {
  ListTodo,
  FileText,
  ShoppingBag,
  CalendarClock,
  CalendarHeart,
  ArrowRight,
  AlertTriangle,
  Factory,
  PackageCheck,
  Bell,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TareaItem } from "@/components/tareas/tarea-item";
import { CitaItem } from "@/components/citas/cita-item";
import { FechaClaveItem } from "@/components/clientes/fecha-clave-item";
import { getUsuarioActual } from "@/lib/session";
import { tareasDeHoy } from "@/lib/data/tareas";
import { citasDeHoy } from "@/lib/data/citas";
import { fechasClaveProximas } from "@/lib/data/clientes";
import { listarCotizaciones } from "@/lib/data/cotizaciones";
import { listarPedidos } from "@/lib/data/pedidos";
import { listarOrdenes } from "@/lib/data/produccion";
import { listarUmbrales } from "@/lib/data/umbrales";
import { pesos } from "@/lib/inventario";
import { semaforo } from "@/lib/pedidos";
import { fechaMonterrey } from "@/lib/citas";
import { ATASCO_DIAS, ETAPA_PRODUCCION, ETAPAS_PRODUCCION } from "@/lib/produccion";
import type { EtapaProduccion } from "@/lib/produccion";

export const metadata = { title: "Hoy" };

const COTIZACION_VIVA = new Set(["borrador", "enviada", "seguimiento"]);
const PEDIDO_ACTIVO = (e: string) => e !== "entregado" && e !== "cancelado";

/*
  "Hoy" — el pulso diario del negocio (§3.16). Vista por rol vía toggle
  Ventas/Taller (Santiago y Fer son ambos admin, así que no se separa por `rol`
  sino por vista elegida). Ventas: pipeline, cobranza, citas. Taller: carga por
  etapa, atascos, entregas de la semana, QC pendientes, stock bajo.
  Ambas comparten "Tareas del día". Sin costos/márgenes (solo-admin en su módulo).
*/
export default async function HoyPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista: vistaRaw } = await searchParams;
  const vista = vistaRaw === "taller" ? "taller" : "ventas";
  const [usuario, tareas] = await Promise.all([getUsuarioActual(), tareasDeHoy()]);
  const saludo = obtenerSaludo();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{saludo},</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{usuario.nombre}</h1>
        </div>
        {/* Toggle de vista por rol */}
        <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          <Link
            href="/hoy"
            className={`rounded-md px-3 py-1.5 ${vista === "ventas" ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Ventas
          </Link>
          <Link
            href="/hoy?vista=taller"
            className={`rounded-md px-3 py-1.5 ${vista === "taller" ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Taller
          </Link>
        </div>
      </div>

      {vista === "taller" ? (
        <VistaTaller tareas={tareas} />
      ) : (
        <VistaVentas tareas={tareas} />
      )}
    </div>
  );
}

// ─── Vista Ventas (Santiago) ────────────────────────────────────────────────
async function VistaVentas({ tareas }: { tareas: Awaited<ReturnType<typeof tareasDeHoy>> }) {
  const [cotizaciones, pedidos, citas, fechas] = await Promise.all([
    listarCotizaciones(),
    listarPedidos(),
    citasDeHoy(),
    fechasClaveProximas(14),
  ]);

  const vivas = cotizaciones.filter((c) => COTIZACION_VIVA.has(c.estado));
  const valorPipeline = vivas.reduce((s, c) => s + c.total, 0);
  const activos = pedidos.filter((p) => PEDIDO_ACTIVO(p.estado));
  const porCobrar = activos.reduce((s, p) => s + (p.saldo ?? 0), 0);
  const semaforos = activos.map((p) => ({ p, color: semaforo(p.fecha_compromiso, p.estado).color }));
  const vencidos = semaforos.filter((x) => x.color === "rojo");
  const prontos = semaforos.filter((x) => x.color === "amarillo");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          href="/ventas/cotizaciones"
          icono={FileText}
          etiqueta="Pipeline (cotizaciones vivas)"
          valor={pesos(valorPipeline)}
          sub={`${vivas.length} ${vivas.length === 1 ? "cotización" : "cotizaciones"}`}
        />
        <Kpi
          href="/ventas/pedidos"
          icono={ShoppingBag}
          etiqueta="Por cobrar (pedidos activos)"
          valor={pesos(porCobrar)}
          sub={`${activos.length} ${activos.length === 1 ? "pedido" : "pedidos"} en curso`}
        />
        <Kpi
          href="/ventas/pedidos"
          icono={CalendarClock}
          etiqueta="Entregas por vencer"
          valor={`${vencidos.length + prontos.length}`}
          sub={vencidos.length > 0 ? `${vencidos.length} vencida${vencidos.length === 1 ? "" : "s"}` : "Al día"}
          alerta={vencidos.length > 0}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-accent" />
            Citas de hoy
          </CardTitle>
          <Link href="/clientes/citas" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Ver agenda
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {citas.length === 0 ? (
            <EmptyState
              icono={CalendarClock}
              titulo="Sin citas hoy"
              descripcion="Las visitas, cierres y entregas del día aparecerán aquí. Agenda desde “Ver agenda”."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {citas.map((c) => (
                <CitaItem key={c.id} cita={c} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {fechas.length > 0 ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarHeart className="size-4 text-accent" />
              Fechas importantes
            </CardTitle>
            <Link href="/clientes/fechas" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
              Ver todas
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {fechas.map((fc) => (
                <FechaClaveItem key={`${fc.cliente_id}-${fc.tipo}`} fc={fc} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <TareasCard tareas={tareas} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-accent" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vencidos.length === 0 && porCobrar === 0 ? (
              <EmptyState
                icono={AlertTriangle}
                titulo="Todo en orden"
                descripcion="Pedidos vencidos y saldos por cobrar aparecerán aquí. Las notificaciones push llegan en una fase posterior."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="space-y-2 text-sm">
                {vencidos.map((x) => (
                  <li key={x.p.id}>
                    <Link
                      href={`/ventas/pedidos/${x.p.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-secondary/50"
                    >
                      <span className="inline-flex items-center gap-2 text-foreground">
                        <AlertTriangle className="size-3.5 text-destructive" />
                        Pedido vencido · {x.p.cliente_nombre ?? "Sin cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {semaforo(x.p.fecha_compromiso, x.p.estado).etiqueta}
                      </span>
                    </Link>
                  </li>
                ))}
                {porCobrar > 0 ? (
                  <li>
                    <Link
                      href="/ventas/pedidos"
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-secondary/50"
                    >
                      <span className="text-foreground">Saldo por cobrar total</span>
                      <span className="font-medium text-warning">{pesos(porCobrar)}</span>
                    </Link>
                  </li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Vista Taller (Fer) ─────────────────────────────────────────────────────
async function VistaTaller({ tareas }: { tareas: Awaited<ReturnType<typeof tareasDeHoy>> }) {
  const [ordenes, umbrales] = await Promise.all([listarOrdenes(), listarUmbrales()]);

  const enTaller = ordenes.filter((o) => o.etapa !== "listo_entrega");
  const cargaPorEtapa = ETAPAS_PRODUCCION.filter((e) => e !== "listo_entrega").map((etapa) => ({
    etapa,
    n: enTaller.filter((o) => o.etapa === etapa).length,
  }));
  const atascos = enTaller.filter((o) => (o.dias_en_etapa ?? 0) >= ATASCO_DIAS);
  const qcPendientes = ordenes.filter((o) => o.etapa === "qc" && !o.qc_ok);

  const { hoy, en7 } = rangoSemanaMonterrey();
  const entregasSemana = enTaller.filter(
    (o) => o.fecha_compromiso && o.fecha_compromiso >= hoy && o.fecha_compromiso <= en7,
  );
  const stockBajo = umbrales.filter((u) => u.minimo > 0 && u.disponibles < u.minimo);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          href="/taller/produccion"
          icono={Factory}
          etiqueta="Órdenes en taller"
          valor={`${enTaller.length}`}
          sub={`${ordenes.length} total`}
        />
        <Kpi
          href="/taller/produccion"
          icono={AlertTriangle}
          etiqueta="Atascadas (≥7d)"
          valor={`${atascos.length}`}
          sub={atascos.length > 0 ? "Requieren seguimiento" : "Ninguna"}
          alerta={atascos.length > 0}
        />
        <Kpi
          href="/taller/produccion"
          icono={PackageCheck}
          etiqueta="QC pendientes"
          valor={`${qcPendientes.length}`}
          sub={qcPendientes.length > 0 ? "En etapa QC" : "Al día"}
          alerta={qcPendientes.length > 0}
        />
        <Kpi
          href="/taller/inventario/umbrales"
          icono={Bell}
          etiqueta="Categorías con stock bajo"
          valor={`${stockBajo.length}`}
          sub={stockBajo.length > 0 ? "Revisa recompra" : "Al día"}
          alerta={stockBajo.length > 0}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="size-4 text-accent" />
            Carga del taller por etapa
          </CardTitle>
          <Link href="/taller/produccion" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Ver kanban
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {enTaller.length === 0 ? (
            <EmptyState
              icono={Factory}
              titulo="Sin órdenes en producción"
              descripcion="Las órdenes del taller aparecerán aquí por etapa."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cargaPorEtapa.map(({ etapa, n }) => (
                <div
                  key={etapa}
                  className={`rounded-lg border px-3 py-2 ${n > 0 ? "border-border" : "border-border/50 opacity-60"}`}
                >
                  <p className="text-xs text-muted-foreground">{ETAPA_PRODUCCION[etapa as EtapaProduccion].etiqueta}</p>
                  <p className="text-xl font-semibold text-foreground">{n}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4 text-accent" />
              Entregas comprometidas (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entregasSemana.length === 0 ? (
              <EmptyState
                icono={Wrench}
                titulo="Sin entregas esta semana"
                descripcion="Las órdenes con fecha de entrega en los próximos 7 días aparecerán aquí."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {entregasSemana.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/taller/produccion/${o.id}`}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50"
                    >
                      <span className="text-foreground">{o.pedido_cliente ?? "Sin cliente"}</span>
                      <span className="text-xs text-muted-foreground">
                        {ETAPA_PRODUCCION[o.etapa].etiqueta} · {o.fecha_compromiso}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <TareasCard tareas={tareas} />
      </div>

      {atascos.length > 0 || stockBajo.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-accent" />
              Alertas del taller
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {atascos.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/taller/produccion/${o.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-secondary/50"
                  >
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <AlertTriangle className="size-3.5 text-destructive" />
                      Atasco · {o.pedido_cliente ?? "Sin cliente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {o.dias_en_etapa}d en {ETAPA_PRODUCCION[o.etapa].etiqueta}
                    </span>
                  </Link>
                </li>
              ))}
              {stockBajo.map((u) => (
                <li key={u.tipo}>
                  <Link
                    href="/taller/inventario/umbrales"
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:bg-secondary/50"
                  >
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <Bell className="size-3.5 text-warning" />
                      Stock bajo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {u.disponibles} disponibles (mín. {u.minimo})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function TareasCard({ tareas }: { tareas: Awaited<ReturnType<typeof tareasDeHoy>> }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="size-4 text-accent" />
          Tareas del día
        </CardTitle>
        <Link href="/hoy/tareas" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
          Ver todas
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {tareas.length === 0 ? (
          <EmptyState
            icono={ListTodo}
            titulo="Sin pendientes para hoy"
            descripcion="Lo vencido, lo de hoy y lo sin fecha aparecerá aquí. Crea tareas desde “Ver todas”."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {tareas.map((t) => (
              <TareaItem key={t.id} tarea={t} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Kpi({
  href,
  icono: Icono,
  etiqueta,
  valor,
  sub,
  alerta = false,
}: {
  href: string;
  icono: typeof FileText;
  etiqueta: string;
  valor: string;
  sub: string;
  alerta?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="h-full p-4 transition-colors hover:border-accent">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icono className="size-4" />
          {etiqueta}
        </div>
        <p className="mt-2 text-2xl font-semibold text-foreground">{valor}</p>
        <p className={`mt-0.5 text-xs ${alerta ? "text-destructive" : "text-muted-foreground"}`}>{sub}</p>
      </Card>
    </Link>
  );
}

/** Rango [hoy, hoy+7d] como fechas de Monterrey (YYYY-MM-DD). */
function rangoSemanaMonterrey(): { hoy: string; en7: string } {
  const ahora = new Date();
  return { hoy: fechaMonterrey(ahora), en7: fechaMonterrey(new Date(ahora.getTime() + 7 * 86400000)) };
}

function obtenerSaludo(): string {
  const h = Number(
    new Intl.DateTimeFormat("es-MX", { timeZone: "America/Monterrey", hour: "numeric", hour12: false }).format(
      new Date(),
    ),
  );
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
