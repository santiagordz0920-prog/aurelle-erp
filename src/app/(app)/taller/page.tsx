import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Taller" };

export default function TallerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Taller"
        descripcion="Producción, inventario y biblioteca de media — el cockpit de Fer."
      />
      <EmptyState
        icono={Hammer}
        titulo="Inventario en Fase 1, Producción en Fase 4"
        descripcion="Inventario completo (SKUs, certificados IGI, consignación, ubicaciones) reemplaza la Sheet de Inventario. El kanban de producción con QC y la biblioteca de renders llegan en Fase 4."
      />
    </div>
  );
}
