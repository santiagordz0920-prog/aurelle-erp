import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { toquesDeHoy, kanbanCadencias } from "@/lib/data/cadencias";
import { SeguimientoPanel } from "@/components/seguimiento/seguimiento-panel";

export const metadata = { title: "Seguimiento" };

/*
  Follow-ups / cadencias — Fase 1 (semiautomática). "Toques de hoy" con el
  mensaje listo (copiar/pegar o wa.me) + kanban por estado. Área de Crecimiento
  (solo-admin, como el resto de Marketing).
*/
export default async function SeguimientoPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) redirect("/hoy");

  const [toques, kanban] = await Promise.all([toquesDeHoy(), kanbanCadencias()]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Seguimiento"
        descripcion="Cada lead recibe sus toques a tiempo. Manda el mensaje listo y márcalo — nada se envía solo."
      />
      <SeguimientoPanel toques={toques} kanban={kanban} />
    </div>
  );
}
