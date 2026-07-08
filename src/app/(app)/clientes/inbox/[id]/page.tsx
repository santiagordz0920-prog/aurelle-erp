import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnviarWhatsApp } from "@/components/clientes/enviar-whatsapp";
import { ResponderInbox } from "@/components/inbox/responder-inbox";
import { BorradorIA } from "@/components/inbox/borrador-ia";
import { MarcarLeidoAlAbrir } from "@/components/inbox/marcar-leido";
import { getConversacion } from "@/lib/data/inbox";
import { horaMensaje } from "@/lib/inbox";
import { whatsappConfigurado } from "@/lib/whatsapp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getConversacion(id);
  return { title: c ? `Chat ${c.cliente_nombre ?? c.telefono}` : "Conversación" };
}

export default async function ConversacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conv = await getConversacion(id);
  if (!conv) notFound();
  const todos = conv.mensajes ?? [];
  // Los borradores de la IA (sensibles) se muestran aparte, para aprobar/editar.
  const borradores = todos.filter((m) => m.estado_entrega === "borrador_ia");
  const mensajes = todos.filter((m) => m.estado_entrega !== "borrador_ia");
  const railActivo = whatsappConfigurado();

  return (
    <div className="space-y-5">
      <MarcarLeidoAlAbrir conversacionId={id} />
      <Link
        href="/clientes/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inbox
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {conv.cliente_nombre ?? conv.telefono}
          </h1>
          <p className="text-sm text-muted-foreground">{conv.telefono}</p>
        </div>
        {conv.cliente_id ? (
          <Link
            href={`/clientes/${conv.cliente_id}`}
            className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
          >
            <User className="size-4" />
            Ver ficha
          </Link>
        ) : null}
      </div>

      {/* Hilo */}
      <Card>
        <CardContent className="space-y-2 p-4">
          {mensajes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sin mensajes en esta conversación.
            </p>
          ) : (
            mensajes.map((m) => {
              const saliente = m.direccion === "saliente";
              return (
                <div
                  key={m.id}
                  className={`flex ${saliente ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      saliente
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.cuerpo}
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] ${
                        saliente ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {m.es_ia ? <Sparkles className="size-3" /> : null}
                      {m.es_ia ? "IA · " : ""}
                      {horaMensaje(m.created_at)}
                      {saliente && m.estado_entrega ? ` · ${m.estado_entrega}` : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Borradores de la IA pendientes de aprobación (mensajes sensibles) */}
      {borradores.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-warning" />
              Respuestas sugeridas por la IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {borradores.map((b) => (
              <BorradorIA
                key={b.id}
                mensajeId={b.id}
                conversacionId={id}
                telefono={conv.telefono}
                cuerpo={b.cuerpo ?? ""}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Responder: por la API oficial si el riel está activo; si no, asistido. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Responder</CardTitle>
        </CardHeader>
        <CardContent>
          {railActivo ? (
            <ResponderInbox conversacionId={id} telefono={conv.telefono} />
          ) : (
            <EnviarWhatsApp
              nombre={conv.cliente_nombre ?? "cliente"}
              telefono={conv.telefono}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
