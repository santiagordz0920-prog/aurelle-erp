import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CotizacionEstado } from "@/components/cotizaciones/cotizacion-estado";
import { Button } from "@/components/ui/button";
import { getCotizacion } from "@/lib/data/cotizaciones";
import { METAL } from "@/lib/cotizaciones";
import { pesos } from "@/lib/inventario";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCotizacion(id);
  return { title: c ? `Cotización ${c.cliente_nombre ?? ""}`.trim() : "Cotización" };
}

export default async function CotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCotizacion(id);
  if (!c) notFound();

  const utilidad =
    c.costo_estimado != null ? c.total - c.costo_estimado : null;
  const margenPct =
    utilidad != null && c.total > 0 ? Math.round((utilidad / c.total) * 100) : null;

  return (
    <div className="space-y-5">
      <Link
        href="/ventas/cotizaciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cotizaciones
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {c.cliente_nombre ?? "Cotización sin cliente"}
          </h1>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {pesos(c.total)}
          </p>
          {c.valida_hasta ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Válida hasta {formatearFecha(c.valida_hasta)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <CotizacionEstado id={c.id} estado={c.estado} />
          <Button asChild variant="outline" size="sm">
            <Link href={`/imprimir/cotizacion/${c.id}`} target="_blank">
              <Printer className="size-4" />
              Ver / imprimir
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Componente</th>
                <th className="px-5 py-3 font-medium">Metal</th>
                <th className="px-5 py-3 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody>
              {(c.lineas ?? []).map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-foreground">{l.descripcion}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {l.metal ? `${METAL[l.metal]} ${l.quilataje ?? ""}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-foreground">
                    {pesos(l.precio)}
                  </td>
                </tr>
              ))}
              <tr className="bg-secondary/40 font-semibold">
                <td className="px-5 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-5 py-3 text-right">{pesos(c.total)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {margenPct != null ? (
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Costo estimado</p>
              <p className="text-sm font-medium text-foreground">
                {pesos(c.costo_estimado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Utilidad</p>
              <p className="text-sm font-medium text-foreground">
                {pesos(utilidad)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Margen</p>
              <p className="text-sm font-semibold text-accent">{margenPct}%</p>
            </div>
            <span className="self-center text-xs text-muted-foreground">
              (solo admin)
            </span>
          </CardContent>
        </Card>
      ) : null}

      {c.notas ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-1 text-sm text-foreground">{c.notas}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
