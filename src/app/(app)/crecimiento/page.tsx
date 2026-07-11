import Link from "next/link";
import { TrendingUp, Lock, Tent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GastoForm } from "@/components/marketing/gasto-form";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { funnelPorFuente, funnelPorCampana, tasa, type FilaFunnel } from "@/lib/data/marketing";
import { CANAL_FUENTE } from "@/lib/clientes";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Crecimiento" };

const KPI_INQUIRY_VISITA = 0.05; // meta central §3.13: inquiry→visita > 5 %

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function totales(filas: FilaFunnel[]): FilaFunnel {
  return filas.reduce(
    (a, f) => ({
      canal: "ads",
      leads: a.leads + f.leads,
      conCita: a.conCita + f.conCita,
      visitaron: a.visitaron + f.visitaron,
      cotizaron: a.cotizaron + f.cotizaron,
      cerraron: a.cerraron + f.cerraron,
      ingreso: a.ingreso + f.ingreso,
      gasto: a.gasto + f.gasto,
    }),
    { canal: "ads", leads: 0, conCita: 0, visitaron: 0, cotizaron: 0, cerraron: 0, ingreso: 0, gasto: 0 } as FilaFunnel,
  );
}

// Área solo-admin (Plan Maestro §5).
export default async function CrecimientoPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Marketing y expos son solo para administradores."
      />
    );
  }

  const ahora = new Date();
  const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const [filas, campanas] = await Promise.all([funnelPorFuente(), funnelPorCampana()]);
  const filasVisibles = filas.filter((f) => f.leads > 0 || f.gasto > 0);
  const tot = totales(filasVisibles);
  const campanasVisibles = campanas.filter((c) => c.leads > 0 || c.gasto > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          titulo="Crecimiento — Marketing"
          descripcion="El funnel por fuente y el costo por cliente (CAC). Solo admin."
        />
        <Link
          href="/crecimiento/expos"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Tent className="size-4" />
          Expos y ROI
        </Link>
      </div>

      {filasVisibles.length === 0 ? (
        <EmptyState
          icono={TrendingUp}
          titulo="Aún sin datos de funnel"
          descripcion="En cuanto entren leads con su fuente (ads/expo/referido) y captures el gasto, el embudo y el CAC aparecen aquí."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Embudo por fuente</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Fuente</th>
                  <th className="py-2 px-3 font-medium">Leads</th>
                  <th className="py-2 px-3 font-medium">Citas</th>
                  <th className="py-2 px-3 font-medium">Visitas</th>
                  <th className="py-2 px-3 font-medium">Cotizaron</th>
                  <th className="py-2 px-3 font-medium">Cierres</th>
                  <th className="py-2 px-3 font-medium">Inquiry→visita</th>
                  <th className="py-2 px-3 font-medium">Gasto</th>
                  <th className="py-2 px-3 font-medium">CAC</th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.map((f) => {
                  const iv = tasa(f.visitaron, f.leads);
                  const cac = f.cerraron > 0 ? f.gasto / f.cerraron : null;
                  return (
                    <tr key={f.canal} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium text-foreground">{CANAL_FUENTE[f.canal]}</td>
                      <td className="py-2 px-3">{f.leads}</td>
                      <td className="py-2 px-3">{f.conCita}</td>
                      <td className="py-2 px-3">{f.visitaron}</td>
                      <td className="py-2 px-3">{f.cotizaron}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{f.cerraron}</td>
                      <td className={`py-2 px-3 font-medium ${f.leads > 0 ? (iv >= KPI_INQUIRY_VISITA ? "text-success" : "text-warning") : "text-muted-foreground"}`}>
                        {f.leads > 0 ? pct(iv) : "—"}
                      </td>
                      <td className="py-2 px-3">{f.gasto > 0 ? pesos(f.gasto) : "—"}</td>
                      <td className="py-2 px-3">{cac != null ? pesos(cac) : "—"}</td>
                    </tr>
                  );
                })}
                <tr className="font-medium text-foreground">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-3">{tot.leads}</td>
                  <td className="py-2 px-3">{tot.conCita}</td>
                  <td className="py-2 px-3">{tot.visitaron}</td>
                  <td className="py-2 px-3">{tot.cotizaron}</td>
                  <td className="py-2 px-3">{tot.cerraron}</td>
                  <td className="py-2 px-3">{tot.leads > 0 ? pct(tasa(tot.visitaron, tot.leads)) : "—"}</td>
                  <td className="py-2 px-3">{tot.gasto > 0 ? pesos(tot.gasto) : "—"}</td>
                  <td className="py-2 px-3">{tot.cerraron > 0 ? pesos(tot.gasto / tot.cerraron) : "—"}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              KPI central: inquiry→visita &gt; 5% (verde). CAC = gasto ÷ cierres. El embudo se mide por
              cliente, agrupado por su fuente de origen.
            </p>
          </CardContent>
        </Card>
      )}

      {campanasVisibles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Por campaña / zona (CAC por campaña)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Campaña / zona</th>
                  <th className="py-2 px-3 font-medium">Canal</th>
                  <th className="py-2 px-3 font-medium">Leads</th>
                  <th className="py-2 px-3 font-medium">Visitas</th>
                  <th className="py-2 px-3 font-medium">Cierres</th>
                  <th className="py-2 px-3 font-medium">Inquiry→visita</th>
                  <th className="py-2 px-3 font-medium">Gasto</th>
                  <th className="py-2 px-3 font-medium">CAC</th>
                </tr>
              </thead>
              <tbody>
                {campanasVisibles.map((c) => {
                  const iv = tasa(c.visitaron, c.leads);
                  const cac = c.cerraron > 0 ? c.gasto / c.cerraron : null;
                  return (
                    <tr key={c.campana} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium text-foreground">{c.campana}</td>
                      <td className="py-2 px-3 text-muted-foreground">{c.canal ? CANAL_FUENTE[c.canal] : "—"}</td>
                      <td className="py-2 px-3">{c.leads}</td>
                      <td className="py-2 px-3">{c.visitaron}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{c.cerraron}</td>
                      <td className={`py-2 px-3 font-medium ${c.leads > 0 ? (iv >= KPI_INQUIRY_VISITA ? "text-success" : "text-warning") : "text-muted-foreground"}`}>
                        {c.leads > 0 ? pct(iv) : "—"}
                      </td>
                      <td className="py-2 px-3">{c.gasto > 0 ? pesos(c.gasto) : "—"}</td>
                      <td className="py-2 px-3">{cac != null ? pesos(cac) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              La campaña/zona sale del &ldquo;detalle&rdquo; del lead (`fuente_detalle`) y del gasto. Para que el
              CAC por campaña cuadre, usa el mismo texto de campaña al capturar el gasto y al registrar el lead.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Capturar gasto de publicidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <GastoForm mesActual={mesActual} />
          <p className="text-xs text-muted-foreground">
            Carga manual del gasto de Meta/ads por mes y canal (la sincronización automática con la API de Meta
            llega después). El gasto alimenta el CAC de la tabla de arriba.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
