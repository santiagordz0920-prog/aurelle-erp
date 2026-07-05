import Link from "next/link";
import { FileText, Plus, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrecioMetalForm } from "@/components/cotizaciones/precio-metal-form";
import { listarCotizaciones, preciosMetalActuales } from "@/lib/data/cotizaciones";
import { ESTADO_COTIZACION } from "@/lib/cotizaciones";
import { pesos } from "@/lib/inventario";
import { getUsuarioActual } from "@/lib/session";

export const metadata = { title: "Cotizaciones" };

export default async function CotizacionesPage() {
  const [cotizaciones, precios, usuario] = await Promise.all([
    listarCotizaciones(),
    preciosMetalActuales(),
    getUsuarioActual(),
  ]);
  const esAdmin = usuario.rol === "admin";

  return (
    <div className="space-y-5">
      <Link
        href="/ventas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Ventas
      </Link>

      <PageHeader
        titulo="Cotizaciones"
        descripcion="Precio de la pieza completa, con identidad Aurelle."
        accion={
          <Button asChild>
            <Link href="/ventas/cotizaciones/nueva">
              <Plus className="size-4" />
              Nueva cotización
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Precios de metal (hoy)</CardTitle>
        </CardHeader>
        <CardContent>
          {esAdmin ? (
            <PrecioMetalForm precios={precios} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {precios.map((p) => (
                <span
                  key={p.id}
                  className="rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {p.metal} {p.pureza ?? ""}:{" "}
                  <span className="font-medium text-foreground">
                    {pesos(p.precio_gramo_mxn)}/g
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cotizaciones.length === 0 ? (
        <EmptyState
          icono={FileText}
          titulo="Aún no hay cotizaciones"
          descripcion="Crea tu primera cotización: agrega los componentes de la pieza y su precio; el total se calcula solo."
          accion={
            <Button asChild>
              <Link href="/ventas/cotizaciones/nueva">
                <Plus className="size-4" />
                Nueva cotización
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {cotizaciones.map((c) => (
            <li key={c.id}>
              <Link
                href={`/ventas/cotizaciones/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {c.cliente_nombre ?? "Sin cliente"}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {pesos(c.total)}
                    </span>
                    {c.valida_hasta ? (
                      <span>· vence {formatearFecha(c.valida_hasta)}</span>
                    ) : null}
                  </div>
                </div>
                <Badge className={ESTADO_COTIZACION[c.estado].clase}>
                  {ESTADO_COTIZACION[c.estado].etiqueta}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
