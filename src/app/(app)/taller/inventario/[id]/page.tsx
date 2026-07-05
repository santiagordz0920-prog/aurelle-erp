import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ItemEditor } from "@/components/inventario/item-editor";
import { getItem } from "@/lib/data/inventario";
import {
  TIPO_ITEM,
  ESTADO_ITEM,
  PROPIEDAD_ITEM,
  pesos,
} from "@/lib/inventario";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  return { title: item?.sku ?? "Item" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const filas: { label: string; valor: string | null }[] = [
    { label: "SKU", valor: item.sku },
    { label: "Tipo", valor: TIPO_ITEM[item.tipo] },
    { label: "Propiedad", valor: PROPIEDAD_ITEM[item.propiedad] },
    {
      label: "Consignante",
      valor:
        item.propiedad === "consignacion"
          ? (item.consignante_nombre ?? null)
          : null,
    },
    { label: "Quilates", valor: item.quilates ? String(item.quilates) : null },
    { label: "Color", valor: item.color },
    { label: "Claridad", valor: item.claridad },
    { label: "Corte", valor: item.corte },
    { label: "Descripción", valor: item.descripcion },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/taller/inventario"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inventario
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {item.sku}
            </span>
            <Badge className={ESTADO_ITEM[item.estado].clase}>
              {ESTADO_ITEM[item.estado].etiqueta}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {item.nombre}
          </h1>
          {item.costo != null ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              Costo: {pesos(item.costo)}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (solo admin)
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="p-5 pt-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            {filas
              .filter((f) => f.valor)
              .map((f, i) => (
                <div key={i}>
                  <dt className="text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="text-sm text-foreground">{f.valor}</dd>
                </div>
              ))}
          </dl>
          {item.certificado_url ? (
            <a
              href={item.certificado_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <FileText className="size-4" />
              Ver certificado IGI
            </a>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 pt-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Estado y ubicación
          </h2>
          <ItemEditor
            itemId={item.id}
            estado={item.estado}
            ubicacion={item.ubicacion}
          />
        </CardContent>
      </Card>
    </div>
  );
}
