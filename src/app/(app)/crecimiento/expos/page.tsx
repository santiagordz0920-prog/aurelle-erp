import Link from "next/link";
import { ArrowLeft, Lock, Tent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpoForm } from "@/components/expos/expo-form";
import { ExpoCard } from "@/components/expos/expo-card";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarExpos } from "@/lib/data/expos";

export const metadata = { title: "Expos" };

export default async function ExposPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState icono={Lock} titulo="Área restringida" descripcion="Expos es solo para administradores." />
    );
  }
  const expos = await listarExpos();

  return (
    <div className="space-y-5">
      <Link
        href="/crecimiento"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Crecimiento
      </Link>

      <PageHeader
        titulo="Expos"
        descripcion="Calendario de expos, captura de leads en el stand y ROI por evento (costo vs leads → cierres → ingreso)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nueva expo</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpoForm />
        </CardContent>
      </Card>

      {expos.length === 0 ? (
        <EmptyState
          icono={Tent}
          titulo="Sin expos todavía"
          descripcion="Agrega una arriba. Los leads que captures en el stand entran al CRM con la expo como fuente, y el ROI se calcula solo."
        />
      ) : (
        <div className="space-y-3">
          {expos.map((e) => (
            <ExpoCard key={e.id} expo={e} />
          ))}
        </div>
      )}
    </div>
  );
}
