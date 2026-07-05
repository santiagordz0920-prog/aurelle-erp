import { TrendingUp, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";

export const metadata = { title: "Crecimiento" };

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

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Crecimiento"
        descripcion="Marketing y expos — el funnel completo con dinero real, solo admin."
      />
      <EmptyState
        icono={TrendingUp}
        titulo="El módulo de Crecimiento llega en Fase 6"
        descripcion="Funnel por fuente y zona, CAC por campaña con gasto de Meta, ROI por expo y comparativo de canales. La atribución de leads empieza a capturarse desde Fase 3."
      />
    </div>
  );
}
