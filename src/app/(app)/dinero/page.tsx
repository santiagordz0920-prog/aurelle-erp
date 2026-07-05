import { Wallet, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";

export const metadata = { title: "Dinero" };

// Área solo-admin (Plan Maestro §5). La RLS lo garantiza en la base; aquí
// además cerramos la puerta en la UI.
export default async function DineroPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Finanzas, márgenes y reglas de precio son solo para administradores."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dinero"
        descripcion="Finanzas, proveedores, gastos recurrentes y comisiones — solo admin."
      />
      <EmptyState
        icono={Wallet}
        titulo="El módulo de Dinero llega en Fase 2"
        descripcion="Ledger con asientos automáticos, P&L mensual, capital de trabajo en vivo, cuentas por pagar, proyección de flujo y reporte al socio. Reemplaza Contabilidad v1."
      />
    </div>
  );
}
