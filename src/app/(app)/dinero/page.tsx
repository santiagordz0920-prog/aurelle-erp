import Link from "next/link";
import { Wallet, Lock, Truck, Repeat, Percent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MovimientoForm } from "@/components/finanzas/movimiento-form";
import { CxpPagarBoton } from "@/components/finanzas/cxp-pagar-boton";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import {
  listarCxP,
  listarMovimientos,
  metricasMes,
  proyeccionFlujo,
  resumenFinanciero,
} from "@/lib/data/finanzas";
import { CATEGORIA_MOVIMIENTO, ESTADO_CXP, META_MENSUAL_MXN, montoConSigno } from "@/lib/finanzas";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Dinero" };

// Área solo-admin (Plan Maestro §5). La RLS lo garantiza en la base; aquí
// además cerramos la puerta en la UI.
export default async function DineroPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Finanzas, márgenes y reglas de precio son solo para administradores."
      />
    );
  }

  const [movimientos, resumen, cxp, metricas, flujo] = await Promise.all([
    listarMovimientos(),
    resumenFinanciero(),
    listarCxP(),
    metricasMes(),
    proyeccionFlujo(),
  ]);
  const cxpPendientes = cxp.filter((c) => c.estado === "pendiente");
  const cxpTotal = cxpPendientes.reduce((s, c) => s + c.monto, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dinero"
        descripcion="Ledger con asientos automáticos, P&L del mes y capital de trabajo — solo admin."
        accion={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dinero/gastos">
                <Repeat className="size-4" />
                Gastos
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dinero/comisiones">
                <Percent className="size-4" />
                Comisiones
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dinero/proveedores">
                <Truck className="size-4" />
                Proveedores
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi etiqueta="Ingresos del mes" valor={pesos(resumen.ingresosMes)} />
        <Kpi etiqueta="Egresos del mes" valor={pesos(resumen.egresosMes)} />
        <Kpi
          etiqueta="Neto del mes"
          valor={pesos(resumen.netoMes)}
          acento={resumen.netoMes >= 0}
        />
        <Kpi
          etiqueta="Cuentas por pagar"
          valor={pesos(cxpTotal)}
          sub={`${cxpPendientes.length} pendiente${cxpPendientes.length === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">P&amp;L del mes por línea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Bridal</p>
              <p className="text-lg font-semibold text-foreground">
                {pesos(metricas.ingresoBridal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Concierge</p>
              <p className="text-lg font-semibold text-foreground">
                {pesos(metricas.ingresoConcierge)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Concierge sobre ingresos
              </p>
              <p className="text-lg font-semibold text-accent">
                {metricas.pctConcierge}%
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Meta del mes ({pesos(META_MENSUAL_MXN)}) · ticket promedio{" "}
                {pesos(metricas.ticketPromedio)}
              </span>
              <span className="font-medium text-foreground">
                {metricas.avanceMeta}%
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(metricas.avanceMeta, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Proyección de flujo{" "}
            <span className="text-muted-foreground">(neto, sin saldo de caja)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {([0, 1, 2] as const).map((i) => (
              <div key={i} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">{(i + 1) * 30} días</p>
                <p
                  className={`mt-1 text-lg font-semibold ${
                    flujo.neto[i] >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {pesos(flujo.neto[i])}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Por cobrar a 90d:{" "}
              <span className="font-medium text-foreground">{pesos(flujo.cobros[2])}</span>
            </span>
            <span>
              Por pagar a 90d:{" "}
              <span className="font-medium text-foreground">{pesos(flujo.pagos[2])}</span>
            </span>
            <span>
              Burn fijo:{" "}
              <span className="font-medium text-foreground">{pesos(flujo.burnMensual)}</span>/mes
            </span>
            {flujo.saldoSinFecha > 0 ? (
              <span>
                Sin fecha (no proyectado):{" "}
                <span className="font-medium text-foreground">{pesos(flujo.saldoSinFecha)}</span>
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {cxp.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Cuentas por pagar{" "}
              <span className="text-muted-foreground">(consignantes)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {cxp.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.consignante_nombre ?? "Consignante"}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={ESTADO_CXP[c.estado].clase}>
                        {ESTADO_CXP[c.estado].etiqueta}
                      </Badge>
                      <span className="truncate">{c.concepto}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      {pesos(c.monto)}
                    </span>
                    {c.estado === "pendiente" ? <CxpPagarBoton id={c.id} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <MovimientoForm />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Movimientos recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movimientos.length === 0 ? (
            <EmptyState
              icono={Wallet}
              titulo="Sin movimientos todavía"
              descripcion="Los asientos se generan solos: al registrar un pago nace el ingreso. Compras, gastos y comisiones se sumarán conforme se construyan esos módulos."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {movimientos.map((m) => {
                const cat = CATEGORIA_MOVIMIENTO[m.categoria];
                const signo = montoConSigno(m);
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.concepto}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge className={cat.clase}>{cat.etiqueta}</Badge>
                        <span>{formatearFecha(m.fecha)}</span>
                        {m.pedido_id ? (
                          <Link
                            href={`/ventas/pedidos/${m.pedido_id}`}
                            className="text-accent hover:underline"
                          >
                            Pedido
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        signo >= 0 ? "text-success" : "text-foreground"
                      }`}
                    >
                      {signo >= 0 ? "+" : "−"}
                      {pesos(m.monto)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  etiqueta,
  valor,
  sub,
  acento,
}: {
  etiqueta: string;
  valor: string;
  sub?: string;
  acento?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          acento === undefined ? "text-foreground" : acento ? "text-success" : "text-destructive"
        }`}
      >
        {valor}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
