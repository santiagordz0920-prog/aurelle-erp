"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, MessageCircle, AlertTriangle } from "lucide-react";
import {
  marcarToqueEnviado,
  escalarLead,
} from "@/app/(app)/crecimiento/seguimiento/actions";
import {
  ESTADO_CADENCIA,
  ESTADOS_CADENCIA,
  ARQUETIPO_TOQUE,
  type EstadoCadencia,
} from "@/lib/cadencias";
import type { ToqueDeHoy, LeadCadencia } from "@/lib/data/cadencias";
import { cn } from "@/lib/utils";

/*
  Panel de Follow-ups F1 (§ DISENO_FUNNEL_MENSAJES): "Toques de hoy" con el
  mensaje listo (copiar/pegar o wa.me) + marcar enviado, y kanban por estado.
  Todo envío lo dispara un humano con un clic (semiautomático).
*/

function Badge({ estado }: { estado: EstadoCadencia }) {
  const e = ESTADO_CADENCIA[estado];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", e.clase)}>{e.etiqueta}</span>
  );
}

function ToqueCard({ toque }: { toque: ToqueDeHoy }) {
  const [pending, start] = useTransition();
  const [hecho, setHecho] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(toque.texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setError("No se pudo copiar.");
    }
  };

  const marcar = () =>
    start(async () => {
      setError(null);
      const r = await marcarToqueEnviado({
        clienteId: toque.cliente_id,
        estado: toque.estado_cadencia,
        toqueN: toque.toque_n,
        arquetipo: toque.arquetipo ?? "continuidad",
        plantillaId: toque.plantilla_id,
        variante: toque.variante,
        texto: toque.texto,
        canal: "manual",
      });
      if (!r.ok) setError(r.error ?? "No se pudo.");
      else setHecho(true);
    });

  const escalar = () =>
    start(async () => {
      setError(null);
      const r = await escalarLead(toque.cliente_id, true);
      if (!r.ok) setError(r.error ?? "No se pudo.");
      else setHecho(true);
    });

  if (hecho) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={`/clientes/${toque.cliente_id}`}
            className="truncate text-sm font-medium text-foreground hover:underline"
          >
            {toque.nombre}
          </Link>
          <Badge estado={toque.estado_cadencia} />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            T{toque.toque_n} · {toque.arquetipo ? ARQUETIPO_TOQUE[toque.arquetipo] : ""}
          </span>
        </div>
        {toque.es_simulacion ? (
          <span className="shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            SIMULACIÓN
          </span>
        ) : null}
      </div>

      {toque.interes ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">Busca: {toque.interes}</p>
      ) : null}

      <p
        className={cn(
          "mt-2 rounded-md bg-secondary/40 p-2.5 text-sm text-foreground whitespace-pre-wrap",
          toque.pendiente_contenido && "italic text-muted-foreground",
        )}
      >
        {toque.texto}
      </p>
      {toque.pendiente_contenido ? (
        <p className="mt-1 text-[11px] text-accent">
          Incentivo pendiente de definir con Fer — ajústalo antes de enviar.
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Copy className="size-3.5" />
          {copiado ? "Copiado" : "Copiar"}
        </button>
        {toque.wa_link ? (
          <a
            href={toque.wa_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <MessageCircle className="size-3.5" />
            WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={marcar}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Check className="size-3.5" />
          {pending ? "…" : "Marcar enviado"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={escalar}
          title="2ct+, presupuesto alto o piedra importante: detiene la cadencia y lo toma un humano"
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
        >
          <AlertTriangle className="size-3.5" />
          Escalar
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function SeguimientoPanel({
  toques,
  kanban,
}: {
  toques: ToqueDeHoy[];
  kanban: Record<EstadoCadencia, LeadCadencia[]>;
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Toques de hoy{toques.length ? ` (${toques.length})` : ""}
        </h2>
        {toques.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nada por enviar hoy. Los toques aparecen aquí cuando a un lead le toca seguimiento.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {toques.map((t) => (
              <ToqueCard key={`${t.cliente_id}-${t.toque_n}`} toque={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pipeline de seguimiento</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ESTADOS_CADENCIA.map((estado) => {
            const leads = kanban[estado] ?? [];
            return (
              <div key={estado} className="w-56 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <Badge estado={estado} />
                  <span className="text-xs text-muted-foreground">{leads.length}</span>
                </div>
                <div className="space-y-1.5">
                  {leads.slice(0, 25).map((l) => (
                    <Link
                      key={l.id}
                      href={`/clientes/${l.id}`}
                      className="block rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:bg-secondary/40"
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="truncate font-medium text-foreground">{l.nombre}</span>
                        {l.escalado ? (
                          <AlertTriangle className="size-3 shrink-0 text-destructive" />
                        ) : l.cadencia_pausada ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">pausa</span>
                        ) : null}
                      </span>
                      {l.interes ? (
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {l.interes}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                  {leads.length === 0 ? (
                    <p className="px-1 text-[11px] text-muted-foreground">—</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
