import Link from "next/link";
import { FileText, ShoppingBag, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Ventas" };

const SUBMODULOS = [
  {
    href: "/ventas/cotizaciones",
    icono: FileText,
    titulo: "Cotizaciones",
    descripcion: "Constructor de cotización con precio de pieza completa y margen. Reemplaza Pricer v1.",
  },
  {
    href: "/ventas/pedidos",
    icono: ShoppingBag,
    titulo: "Pedidos",
    descripcion: "La columna vertebral: plan de pagos, candado de anticipo, reserva de inventario y semáforos.",
  },
];

export default function VentasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Ventas"
        descripcion="Cotizaciones y pedidos — el flujo comercial completo."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {SUBMODULOS.map((m) => {
          const Icono = m.icono;
          return (
            <Link key={m.titulo} href={m.href}>
              <Card className="flex h-full flex-col p-5 transition-colors hover:border-accent">
                <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icono className="size-5" />
                </div>
                <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                  {m.titulo}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {m.descripcion}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
