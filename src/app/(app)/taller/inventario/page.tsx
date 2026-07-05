import Link from "next/link";
import { Boxes, Plus, ArrowLeft, Gem } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InventarioFiltros } from "@/components/inventario/inventario-filtros";
import { listarItems, valorInventario } from "@/lib/data/inventario";
import {
  TIPO_ITEM,
  ESTADO_ITEM,
  PROPIEDAD_ITEM,
  pesos,
} from "@/lib/inventario";

export const metadata = { title: "Inventario" };

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; estado?: string }>;
}) {
  const filtro = await searchParams;
  const [items, valor] = await Promise.all([
    listarItems(filtro),
    valorInventario(),
  ]);
  const hayFiltro = Boolean(filtro.q || filtro.tipo || filtro.estado);

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
        titulo="Inventario"
        descripcion="Cada piedra, montura y pieza con su historia completa."
        accion={
          <Button asChild>
            <Link href="/taller/inventario/nuevo">
              <Plus className="size-4" />
              Nuevo item
            </Link>
          </Button>
        }
      />

      {valor != null ? (
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Valor del inventario propio (a costo)
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {pesos(valor)}
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
            <Gem className="size-5" />
          </div>
        </Card>
      ) : null}

      <InventarioFiltros />

      {items.length === 0 ? (
        hayFiltro ? (
          <EmptyState
            icono={Boxes}
            titulo="Sin resultados"
            descripcion="Ningún item coincide con los filtros. Ajusta la búsqueda."
          />
        ) : (
          <EmptyState
            icono={Boxes}
            titulo="Aún no hay inventario"
            descripcion="Registra tu primer item: piedra, diamante, montura o pieza terminada, con su SKU, certificado y ubicación."
            accion={
              <Button asChild>
                <Link href="/taller/inventario/nuevo">
                  <Plus className="size-4" />
                  Registrar item
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/taller/inventario/${i.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {i.sku}
                    </span>
                    <p className="truncate font-medium text-foreground">
                      {i.nombre}
                    </p>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{TIPO_ITEM[i.tipo]}</span>
                    {i.ubicacion ? <span>· {i.ubicacion}</span> : null}
                    <span>· {PROPIEDAD_ITEM[i.propiedad]}</span>
                    {i.propiedad === "consignacion" && i.consignante_nombre ? (
                      <span>({i.consignante_nombre})</span>
                    ) : null}
                    {i.costo != null ? (
                      <span className="font-medium text-foreground">
                        · {pesos(i.costo)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Badge className={ESTADO_ITEM[i.estado].clase}>
                  {ESTADO_ITEM[i.estado].etiqueta}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
