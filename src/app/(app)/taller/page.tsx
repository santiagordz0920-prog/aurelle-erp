import Link from "next/link";
import { Boxes, Hammer, Image as ImageIcon, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Taller" };

const SUBMODULOS = [
  {
    href: "/taller/inventario",
    icono: Boxes,
    titulo: "Inventario",
    descripcion: "Piedras, monturas y piezas: SKU, certificados, consignación y ubicaciones.",
    activo: true,
  },
  {
    href: "/taller/produccion",
    icono: Hammer,
    titulo: "Producción",
    descripcion: "Kanban de etapas, QC y costos del taller. Los costos alimentan el margen del pedido.",
    activo: true,
  },
  {
    href: "/taller",
    icono: ImageIcon,
    titulo: "Biblioteca",
    descripcion: "Renders, CADs y fotos por pedido, listos para WhatsApp. Fase 4.",
    activo: false,
  },
];

export default function TallerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Taller"
        descripcion="Producción, inventario y biblioteca de media — el cockpit de Fer."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBMODULOS.map((m) => {
          const Icono = m.icono;
          const contenido = (
            <Card
              className={cn(
                "flex h-full flex-col p-5 transition-colors",
                m.activo ? "hover:border-accent" : "opacity-60",
              )}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                <Icono className="size-5" />
              </div>
              <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                {m.titulo}
                {m.activo ? <ArrowRight className="size-4 text-muted-foreground" /> : null}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.descripcion}</p>
            </Card>
          );
          return m.activo ? (
            <Link key={m.titulo} href={m.href}>
              {contenido}
            </Link>
          ) : (
            <div key={m.titulo}>{contenido}</div>
          );
        })}
      </div>
    </div>
  );
}
