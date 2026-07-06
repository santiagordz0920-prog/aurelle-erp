import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { listarConversaciones } from "@/lib/data/inbox";
import { horaMensaje } from "@/lib/inbox";

export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const conversaciones = await listarConversaciones();

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>

      <PageHeader
        titulo="Inbox"
        descripcion="Conversaciones de WhatsApp. (El riel en vivo se conecta cuando Meta esté listo; por ahora, muestra.)"
      />

      {conversaciones.length === 0 ? (
        <EmptyState
          icono={MessageSquareText}
          titulo="Sin conversaciones"
          descripcion="Cuando el riel oficial de WhatsApp esté activo, cada mensaje entrante creará aquí su conversación."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {conversaciones.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clientes/inbox/${c.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <span className="truncate">{c.cliente_nombre ?? c.telefono}</span>
                    {c.no_leidos > 0 ? (
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                        {c.no_leidos}
                      </span>
                    ) : null}
                  </p>
                  {c.ultimo_cuerpo ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {c.ultimo_cuerpo}
                    </p>
                  ) : null}
                </div>
                {c.ultimo_at ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {horaMensaje(c.ultimo_at)}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
