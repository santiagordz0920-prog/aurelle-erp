import Link from "next/link";
import {
  Users,
  Plus,
  CalendarClock,
  CalendarHeart,
  MessageSquareText,
  Repeat,
  Phone,
  Mail,
  AtSign,
  MessageCircle,
  Link2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BuscadorClientes } from "@/components/clientes/buscador-clientes";
import { VistaToggle } from "@/components/clientes/vista-toggle";
import { PipelineBoard } from "@/components/clientes/pipeline-board";
import { CanalBadge } from "@/components/clientes/estado-badge";
import { EstadoSelectorMini } from "@/components/clientes/estado-selector";
import { listarLeads, contarPorEstado, type LeadResumen } from "@/lib/data/clientes";
import {
  PIPELINE_ORDEN,
  ESTADO_PIPELINE,
  contactoPrincipal,
  type EstadoPipeline,
  type MetodoContacto,
} from "@/lib/clientes";
import { cn, tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Clientes" };

const ETAPAS_FILTRO: EstadoPipeline[] = [...PIPELINE_ORDEN, "perdido"];

// lucide ya no trae iconos de marca (Instagram/Facebook): genéricos por método.
const ICONO_CONTACTO: Record<MetodoContacto, typeof Phone> = {
  telefono: Phone,
  correo: Mail,
  instagram: AtSign,
  facebook: MessageCircle,
  otro: Link2,
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; vista?: string; etapa?: string }>;
}) {
  const { q, vista, etapa: etapaRaw } = await searchParams;
  const etapa = ETAPAS_FILTRO.includes(etapaRaw as EstadoPipeline)
    ? (etapaRaw as EstadoPipeline)
    : undefined;
  const [leads, conteo] = await Promise.all([listarLeads(q, etapa), contarPorEstado()]);
  const total = Object.values(conteo).reduce((a, b) => a + b, 0);
  const esPipeline = vista === "pipeline";

  const linkCon = (e?: EstadoPipeline) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (vista) p.set("vista", vista);
    if (e) p.set("etapa", e);
    const s = p.toString();
    return s ? `/clientes?${s}` : "/clientes";
  };

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
            <Button asChild variant="outline">
              <Link href="/clientes/fechas">
                <CalendarHeart className="size-4" />
                Fechas
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/clientes/postventa">
                <Repeat className="size-4" />
                Postventa
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

      {/* Filtro por etapa del pipeline (feedback de Santiago 2026-07-11). */}
      <div className="flex flex-wrap gap-1.5">
        <ChipEtapa href={linkCon()} activo={!etapa} etiqueta="Todos" n={total} />
        {ETAPAS_FILTRO.map((e) => (
          <ChipEtapa
            key={e}
            href={linkCon(e)}
            activo={etapa === e}
            etiqueta={ESTADO_PIPELINE[e].etiqueta}
            n={conteo[e]}
          />
        ))}
      </div>

      {leads.length === 0 ? (
        q || etapa ? (
          <EmptyState
            icono={Users}
            titulo="Sin resultados"
            descripcion={
              q
                ? `No hay clientes que coincidan con "${q}". Prueba con otro nombre, teléfono o etiqueta.`
                : `No hay leads en la etapa "${etapa ? ESTADO_PIPELINE[etapa].etiqueta : ""}".`
            }
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
        <PipelineBoard clientes={leads} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {leads.map((c) => (
            <LeadFila key={c.id} lead={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ChipEtapa({
  href,
  activo,
  etiqueta,
  n,
}: {
  href: string;
  activo: boolean;
  etiqueta: string;
  n: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-secondary/60",
      )}
    >
      {etiqueta}
      <span className={cn("tabular-nums", activo ? "opacity-80" : "opacity-60")}>
        {n}
      </span>
    </Link>
  );
}

/*
  Fila de lead at-a-glance: qué busca, contacto principal (el preferido; los
  demás solo en la ficha), última interacción, blurbs de atención (mensajes sin
  contestar / respuesta de IA por aprobar) y override manual de etapa.
*/
function LeadFila({ lead: c }: { lead: LeadResumen }) {
  const contacto = contactoPrincipal(c);
  const IconoContacto = contacto ? ICONO_CONTACTO[contacto.metodo] : null;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50">
      <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{c.nombre}</p>
          {c.etiquetas.map((e) => (
            <Badge key={e} className="bg-accent-soft text-accent">
              {e}
            </Badge>
          ))}
          {c.no_leidos > 0 ? (
            <Badge className="bg-destructive/10 text-destructive">
              {c.no_leidos === 1 ? "1 sin contestar" : `${c.no_leidos} sin contestar`}
            </Badge>
          ) : null}
          {c.borradores > 0 ? (
            <Badge className="bg-accent-soft text-accent">
              Respuesta por aprobar
            </Badge>
          ) : null}
        </div>
        {c.interes ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-foreground/80">{c.interes}</p>
        ) : null}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {contacto && IconoContacto ? (
            <span className="inline-flex items-center gap-1">
              <IconoContacto className="size-3" />
              {contacto.valor}
            </span>
          ) : null}
          <CanalBadge canal={c.fuente_canal} detalle={c.fuente_detalle} />
          {c.ultima_interaccion ? (
            <span>Último mensaje {tiempoRelativo(c.ultima_interaccion)}</span>
          ) : null}
        </div>
      </Link>
      <EstadoSelectorMini clienteId={c.id} estado={c.estado_pipeline} />
    </li>
  );
}
