import Link from "next/link";
import { Users, Plus, Cake, Heart, CalendarClock, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuscadorClientes } from "@/components/clientes/buscador-clientes";
import { VistaToggle } from "@/components/clientes/vista-toggle";
import { PipelineBoard } from "@/components/clientes/pipeline-board";
import { EstadoBadge, CanalBadge } from "@/components/clientes/estado-badge";
import { listarClientes } from "@/lib/data/clientes";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vista?: string }>;
}) {
  const { q, vista } = await searchParams;
  const clientes = await listarClientes(q);
  const esPipeline = vista === "pipeline";

  return (
    <div className="space-y-5">
      <PageHeader
        titulo="Clientes"
        descripcion="La memoria comercial de Aurelle: cada lead, cita y pedido en un solo lugar."
        accion={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/clientes/inbox">
                <MessageSquareText className="size-4" />
                Inbox
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/clientes/citas">
                <CalendarClock className="size-4" />
                Citas
              </Link>
            </Button>
            <Button asChild>
              <Link href="/clientes/nuevo">
                <Plus className="size-4" />
                Nuevo cliente
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BuscadorClientes />
        <VistaToggle />
      </div>

      {clientes.length === 0 ? (
        q ? (
          <EmptyState
            icono={Users}
            titulo="Sin resultados"
            descripcion={`No hay clientes que coincidan con "${q}". Prueba con otro nombre, teléfono o etiqueta.`}
          />
        ) : (
          <EmptyState
            icono={Users}
            titulo="Aún no hay clientes"
            descripcion="Registra tu primer cliente para empezar a construir su ficha 360: datos, fuente de origen, notas y —más adelante— conversaciones, cotizaciones y pedidos."
            accion={
              <Button asChild>
                <Link href="/clientes/nuevo">
                  <Plus className="size-4" />
                  Registrar cliente
                </Link>
              </Button>
            }
          />
        )
      ) : esPipeline ? (
        <PipelineBoard clientes={clientes} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {c.nombre}
                    </p>
                    {c.etiquetas.map((e) => (
                      <Badge key={e} className="bg-accent-soft text-accent">
                        {e}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {c.telefono ? <span>{c.telefono}</span> : null}
                    <CanalBadge canal={c.fuente_canal} detalle={c.fuente_detalle} />
                    {c.fecha_boda ? (
                      <span className="inline-flex items-center gap-1">
                        <Heart className="size-3" /> {formatearFecha(c.fecha_boda)}
                      </span>
                    ) : null}
                    {c.fecha_nacimiento ? (
                      <span className="inline-flex items-center gap-1">
                        <Cake className="size-3" />{" "}
                        {formatearFecha(c.fecha_nacimiento)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <EstadoBadge estado={c.estado_pipeline} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
