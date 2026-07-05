import Link from "next/link";
import { Wallet, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MovimientoForm } from "@/components/finanzas/movimiento-form";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarMovimientos, resumenFinanciero } from "@/lib/data/finanzas";
import { CATEGORIA_MOVIMIENTO, montoConSigno } from "@/lib/finanzas";
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

  const [movimientos, resumen] = await Promise.all([
    listarMovimientos(),
    resumenFinanciero(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dinero"
        descripcion="Ledger con asientos automáticos, P&L del mes y capital de trabajo — solo admin."
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
          etiqueta="Capital de trabajo atrapado"
          valor={pesos(resumen.capitalAtrapado)}
          sub="Costos incurridos − pagos recibidos"
        />
      </div>

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
