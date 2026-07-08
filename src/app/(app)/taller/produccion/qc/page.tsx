import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QcChecklistEditor } from "@/components/produccion/qc-checklist-editor";
import { getUsuarioActual } from "@/lib/session";
import { listarChecklistQC } from "@/lib/data/produccion";
import { LINEA_NEGOCIO } from "@/lib/pedidos";
import type { LineaNegocio } from "@/lib/pedidos";

export const metadata = { title: "Checklist de QC" };

const LINEAS: LineaNegocio[] = ["bridal", "concierge"];

export default async function ChecklistQcPage() {
  const usuario = await getUsuarioActual();
  // Config del negocio: solo admin. La RLS también lo impone.
  if (usuario.rol !== "admin") redirect("/taller/produccion");

  const items = await listarChecklistQC();

  return (
    <div className="space-y-5">
      <Link
        href="/taller/produccion"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Producción
      </Link>

      <PageHeader
        titulo="Checklist de control de calidad"
        descripcion="Los puntos que el taller revisa antes de cerrar el QC de una pieza. Se editan por línea; los cambios aplican a las próximas órdenes de esa línea."
      />

      {LINEAS.map((linea) => (
        <Card key={linea}>
          <CardHeader>
            <CardTitle className="text-sm">{LINEA_NEGOCIO[linea]}</CardTitle>
          </CardHeader>
          <CardContent>
            <QcChecklistEditor
              linea={linea}
              items={items.filter((i) => i.linea_negocio === linea)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
