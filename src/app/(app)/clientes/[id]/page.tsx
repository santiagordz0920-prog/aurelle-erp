import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Heart,
  Cake,
  Users,
  CalendarClock,
  FileText,
  ShoppingBag,
  Image as ImageIcon,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, type Tab } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { CanalBadge } from "@/components/clientes/estado-badge";
import { EstadoSelector } from "@/components/clientes/estado-selector";
import { NotaForm } from "@/components/clientes/nota-form";
import { TareaForm } from "@/components/tareas/tarea-form";
import { TareaItem } from "@/components/tareas/tarea-item";
import { CitaForm } from "@/components/citas/cita-form";
import { CitaItem } from "@/components/citas/cita-item";
import { EnviarWhatsApp } from "@/components/clientes/enviar-whatsapp";
import { DocumentosCliente } from "@/components/documentos/documentos-cliente";
import { MediaCard } from "@/components/media/media-card";
import { getCliente, getNotas } from "@/lib/data/clientes";
import { listarTareas } from "@/lib/data/tareas";
import { listarCitas } from "@/lib/data/citas";
import { listarUsuarios } from "@/lib/data/usuarios";
import { getUsuarioActual } from "@/lib/session";
import { EliminarCliente } from "@/components/clientes/eliminar-cliente";
import { listarDocumentosDeCliente } from "@/lib/data/documentos";
import { listarMedia } from "@/lib/data/media";
import { CANAL_FUENTE } from "@/lib/clientes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await getCliente(id);
  return { title: cliente?.nombre ?? "Cliente" };
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await getCliente(id);
  if (!cliente) notFound();

  const [notas, tareas, usuarios, citas, documentos, media, usuario] = await Promise.all([
    getNotas(id),
    listarTareas({ entidad_tipo: "cliente", entidad_id: id }),
    listarUsuarios(),
    listarCitas({ cliente_id: id }),
    listarDocumentosDeCliente(id),
    listarMedia({ cliente_id: id }),
    getUsuarioActual(),
  ]);
  const esAdmin = usuario.rol === "admin";
  const citasProximas = citas.filter(
    (c) => c.estado !== "completada" && c.estado !== "cancelada",
  ).length;
  const tareasPendientes = tareas.filter((t) => t.estado === "pendiente").length;

  const tabs: Tab[] = [
    { id: "resumen", label: "Resumen", content: <Resumen cliente={cliente} /> },
    {
      id: "notas",
      label: "Notas",
      badge: notas.length,
      content: (
        <div className="space-y-5">
          <NotaForm clienteId={cliente.id} />
          {notas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin notas todavía. Registra lo que sepas del cliente aquí.
            </p>
          ) : (
            <ul className="space-y-3">
              {notas.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-sm text-foreground">{n.texto}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {n.autor_nombre ?? "Equipo"} · {formatearFechaHora(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "tareas",
      label: "Tareas",
      badge: tareasPendientes,
      content: (
        <div className="space-y-4">
          <TareaForm
            usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
            entidad={{ tipo: "cliente", id: cliente.id }}
          />
          {tareas.length === 0 ? (
            <EmptyState
              icono={ListTodo}
              titulo="Sin tareas para este cliente"
              descripcion="Crea una en dos toques: “Nueva tarea”. Quedará vinculada a esta ficha."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {tareas.map((t) => (
                <TareaItem key={t.id} tarea={t} ocultarEntidad />
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "conversacion",
      label: "Conversación",
      content: (
        <EnviarWhatsApp
          nombre={cliente.nombre}
          pareja={cliente.pareja_nombre}
          telefono={cliente.telefono}
        />
      ),
    },
    {
      id: "citas",
      label: "Citas",
      badge: citasProximas,
      content: (
        <div className="space-y-4">
          <CitaForm cliente={{ id: cliente.id, nombre: cliente.nombre }} />
          {citas.length === 0 ? (
            <EmptyState
              icono={CalendarClock}
              titulo="Sin citas"
              descripcion="Agenda la primera visita, un cierre o una entrega para este cliente."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {citas.map((c) => (
                <CitaItem key={c.id} cita={c} ocultarCliente />
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "cotizaciones",
      label: "Cotizaciones",
      content: (
        <EmptyState
          icono={FileText}
          titulo="Cotizaciones en Fase 1"
          descripcion="Las cotizaciones de este cliente y su estado se listarán aquí."
        />
      ),
    },
    {
      id: "pedidos",
      label: "Pedidos",
      content: (
        <EmptyState
          icono={ShoppingBag}
          titulo="Pedidos en Fase 1"
          descripcion="Pedidos, plan de pagos y avances de producción del cliente."
        />
      ),
    },
    {
      id: "documentos",
      label: "Documentos",
      badge: documentos.length,
      content:
        documentos.length === 0 ? (
          <EmptyState
            icono={FileText}
            titulo="Sin documentos"
            descripcion="El contrato se genera solo al confirmar el pedido y se archiva aquí; los firmados quedan con su evidencia."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <DocumentosCliente documentos={documentos} />
        ),
    },
    {
      id: "media",
      label: "Media",
      badge: media.length,
      content:
        media.length === 0 ? (
          <EmptyState
            icono={ImageIcon}
            titulo="Sin media todavía"
            descripcion="Renders, CADs y fotos de las piezas del cliente aparecerán aquí, listos para enviar por WhatsApp."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {media.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                pedidoId={m.pedido_id}
                telefono={cliente.telefono}
                clienteNombre={cliente.nombre}
                conAcciones={false}
              />
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {cliente.nombre}
            </h1>
            {cliente.etiquetas.map((e) => (
              <Badge key={e} className="bg-accent-soft text-accent">
                {e}
              </Badge>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {cliente.telefono ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" />
                {cliente.telefono}
              </span>
            ) : null}
            <CanalBadge canal={cliente.fuente_canal} detalle={cliente.fuente_detalle} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <EstadoSelector
            clienteId={cliente.id}
            estado={cliente.estado_pipeline}
            motivo={cliente.motivo_perdida}
          />
          {esAdmin ? <EliminarCliente clienteId={cliente.id} nombre={cliente.nombre} /> : null}
        </div>
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}

function Resumen({
  cliente,
}: {
  cliente: Awaited<ReturnType<typeof getCliente>>;
}) {
  if (!cliente) return null;
  const filas: { icono: typeof Phone; label: string; valor: string | null }[] = [
    { icono: Phone, label: "Teléfono", valor: cliente.telefono },
    {
      icono: Heart,
      label: "Fecha de boda",
      valor: cliente.fecha_boda ? formatearFecha(cliente.fecha_boda) : null,
    },
    { icono: Users, label: "Pareja", valor: cliente.pareja_nombre },
    {
      icono: Cake,
      label: "Nacimiento",
      valor: cliente.fecha_nacimiento
        ? formatearFecha(cliente.fecha_nacimiento)
        : null,
    },
    {
      icono: Users,
      label: "Fuente",
      valor: cliente.fuente_canal
        ? `${CANAL_FUENTE[cliente.fuente_canal]}${cliente.fuente_detalle ? ` · ${cliente.fuente_detalle}` : ""}`
        : null,
    },
    {
      icono: Users,
      label: "Referido por",
      valor: cliente.referido_por_externo,
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {filas.map((f, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <f.icono className="size-4" />
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="text-sm text-foreground">
              {f.valor ?? <span className="text-muted-foreground">—</span>}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
