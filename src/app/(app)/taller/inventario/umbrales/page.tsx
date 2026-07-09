import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UmbralRow } from "@/components/inventario/umbral-row";
import { getUsuarioActual } from "@/lib/session";
import { listarUmbrales } from "@/lib/data/umbrales";
import { TIPO_ITEM } from "@/lib/inventario";

export const metadata = { title: "Umbrales de stock" };

export default async function UmbralesPage() {
  const usuario = await getUsuarioActual();
  // Config del negocio: solo admin. La RLS de umbral_stock también lo impone.
  if (usuario.rol !== "admin") redirect("/taller/inventario");

  const umbrales = await listarUmbrales();

  return (
    <div className="space-y-5">
      <Link
        href="/taller/inventario"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inventario
      </Link>

      <PageHeader
        titulo="Umbrales de stock"
        descripcion="Fija el mínimo de piezas disponibles por categoría. Cada noche, si el stock cae por debajo, aparece una tarea de recompra en Hoy."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mínimo por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {umbrales.map((u) => (
              <UmbralRow
                key={u.tipo}
                tipo={u.tipo}
                etiqueta={TIPO_ITEM[u.tipo]}
                minimo={u.minimo}
                disponibles={u.disponibles}
              />
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Mínimo 0 = sin alerta para esa categoría. Solo cuentan las piezas en estado “disponible”
            (las reservadas o vendidas no).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
