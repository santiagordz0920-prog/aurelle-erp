import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Ventas" };

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ventas"
        descripcion="Cotizaciones y pedidos — la columna vertebral del negocio."
      />
      <EmptyState
        icono={ShoppingBag}
        titulo="Cotizador y Pedidos llegan en Fase 1"
        descripcion="El cotizador con feed de metales y PDF de marca, y los pedidos con plan de pagos, candado de anticipo y reserva de inventario. Reemplazan Pricer v1 y el lado comercial de Operaciones v1."
      />
    </div>
  );
}
