import Link from "next/link";
import {
  ListTodo,
  FileText,
  ShoppingBag,
  CalendarClock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TareaItem } from "@/components/tareas/tarea-item";
import { CitaItem } from "@/components/citas/cita-item";
import { getUsuarioActual } from "@/lib/session";
import { tareasDeHoy } from "@/lib/data/tareas";
import { citasDeHoy } from "@/lib/data/citas";
import { listarCotizaciones } from "@/lib/data/cotizaciones";
import { listarPedidos } from "@/lib/data/pedidos";
import { pesos } from "@/lib/inventario";
import { semaforo } from "@/lib/pedidos";

export const metadata = { title: "Hoy" };

const COTIZACION_VIVA = new Set(["borrador", "enviada", "seguimiento"]);
const PEDIDO_ACTIVO = (e: string) => e !== "entregado" && e !== "cancelado";

/*
  "Hoy" — el pulso diario del negocio (§3.16). v1: tareas del día + KPIs reales
  agregados de Cotizaciones y Pedidos. La vista por rol (Santiago vs Fer) y las
  notificaciones push llegan después; aquí ambos fundadores ven el mismo pulso
  (sin costos ni márgenes, que son solo-admin en su propio módulo).
*/
export default async function HoyPage() {
  const [usuario, tareas, cotizaciones, pedidos, citas] = await Promise.all([
    getUsuarioActual(),
    tareasDeHoy(),
    listarCotizaciones(),
    listarPedidos(),
    citasDeHoy(),
  ]);
  const saludo = obtenerSaludo();

  const vivas = cotizaciones.filter((c) => COTIZACION_VIVA.has(c.estado));
  const valorPipeline = vivas.reduce((s, c) => s + c.total, 0);

  const activos = pedidos.filter((p) => PEDIDO_ACTIVO(p.estado));
  const porCobrar = activos.reduce((s, p) => s + (p.saldo ?? 0), 0);

  const semaforos = activos.map((p) => ({
    p,
    color: semaforo(p.fecha_compromiso, p.estado).color,
  }));
  const vencidos = semaforos.filter((x) => x.color === "rojo");
  const prontos = semaforos.filter((x) => x.color === "amarillo");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{saludo},</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {usuario.nombre}
        </h1>
      </div>

      {/* KPIs del pulso */}
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
          sub={
            vencidos.length > 0
              ? `${vencidos.length} vencida${vencidos.length === 1 ? "" : "s"}`
              : "Al día"
          }
          alerta={vencidos.length > 0}
        />
      </div>

      {/* Citas de hoy */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4 text-accent" />
            Citas de hoy
          </CardTitle>
          <Link
            href="/clientes/citas"
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
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

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Tareas del día */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4 text-accent" />
              Tareas del día
            </CardTitle>
            <Link
              href="/hoy/tareas"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
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

        {/* Alertas derivadas */}
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
    </div>
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
        <p className={`mt-0.5 text-xs ${alerta ? "text-destructive" : "text-muted-foreground"}`}>
          {sub}
        </p>
      </Card>
    </Link>
  );
}

function obtenerSaludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}
