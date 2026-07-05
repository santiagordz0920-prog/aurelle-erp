import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Clientes"
        descripcion="CRM, conversaciones de WhatsApp y citas — la memoria comercial completa de Aurelle."
      />
      <EmptyState
        icono={Users}
        titulo="El núcleo comercial llega en Fase 1"
        descripcion="Aquí vivirá la ficha 360 de cada cliente: datos, historial de conversación, citas, cotizaciones, pedidos y pagos. El inbox de WhatsApp se integra en Fase 3."
      />
    </div>
  );
}
