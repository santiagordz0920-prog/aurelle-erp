"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Asistente interno del ERP (Plan Maestro §3.19): burbuja fija abajo a la
  IZQUIERDA en toda la app (el Inbox flotante vive a la derecha). Chat con Claude
  para operar y consultar el ERP con texto. Manda el historial a /api/asistente,
  que corre el tool use con la sesión del usuario (RLS). Las acciones ejecutadas
  vuelven con enlaces a la pantalla correspondiente.
*/

type Enlace = { href: string; etiqueta: string };
type AccionPendiente = { herramienta: string; args: Record<string, unknown>; resumen: string };
type Turno = {
  role: "user" | "assistant";
  content: string;
  enlaces?: Enlace[];
  /** Acción sensible propuesta; se resuelve con el botón de la tarjeta. */
  pendiente?: AccionPendiente;
  /** Ya se confirmó o canceló: la tarjeta deja de mostrarse. */
  resuelta?: boolean;
};

const SALUDO: Turno = {
  role: "assistant",
  content:
    "Soy tu asistente del ERP. Puedo consultar el negocio (ventas del mes, pipeline, citas de hoy, saldos de pedidos) y dar de alta clientes, tareas, notas y citas. ¿Qué necesitas?",
};

export function AsistenteFlotante() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turnos, abierto, cargando]);

  const enviar = async () => {
    const mensaje = texto.trim();
    if (!mensaje || cargando) return;
    // Mandar un mensaje nuevo descarta cualquier propuesta sin confirmar.
    const previos = turnos.map((t) => (t.pendiente && !t.resuelta ? { ...t, resuelta: true } : t));
    const nuevos: Turno[] = [...previos, { role: "user", content: mensaje }];
    setTurnos(nuevos);
    setTexto("");
    setCargando(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Solo mandamos role+content (los enlaces son de la UI, no del modelo).
        // `path` = pantalla actual, para el contexto ("este pedido", "súbele...").
        body: JSON.stringify({
          mensajes: nuevos.map((t) => ({ role: t.role, content: t.content })),
          path: pathname,
        }),
      });
      const data = (await res.json()) as {
        respuesta?: string;
        enlaces?: Enlace[];
        pendiente?: AccionPendiente;
        error?: string;
      };
      setTurnos((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.respuesta ?? data.error ?? "No pude responder.",
          enlaces: dedupeEnlaces(data.enlaces ?? []),
          pendiente: data.pendiente,
        },
      ]);
    } catch {
      setTurnos((prev) => [
        ...prev,
        { role: "assistant", content: "No hay conexión ahora. Intenta de nuevo en un momento." },
      ]);
    } finally {
      setCargando(false);
    }
  };

  /** Confirmar o cancelar una acción sensible propuesta (tarjeta). */
  const resolver = async (indice: number, pendiente: AccionPendiente, confirmar: boolean) => {
    if (cargando) return;
    // Marca la propuesta como resuelta (oculta la tarjeta) pase lo que pase.
    setTurnos((prev) => prev.map((t, i) => (i === indice ? { ...t, resuelta: true } : t)));
    if (!confirmar) {
      setTurnos((prev) => [...prev, { role: "assistant", content: "Listo, no lo hice." }]);
      return;
    }
    setCargando(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: pendiente }),
      });
      const data = (await res.json()) as { respuesta?: string; enlaces?: Enlace[]; error?: string };
      setTurnos((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.respuesta ?? data.error ?? "No se pudo ejecutar.",
          enlaces: dedupeEnlaces(data.enlaces ?? []),
        },
      ]);
    } catch {
      setTurnos((prev) => [
        ...prev,
        { role: "assistant", content: "No hay conexión ahora. Intenta de nuevo en un momento." },
      ]);
    } finally {
      setCargando(false);
    }
  };

  // Dentro del hilo del Inbox el chat estorba; en el resto, vive.
  if (pathname.startsWith("/clientes/inbox/")) return null;

  return (
    <div className="fixed bottom-20 left-4 z-30 print:hidden md:bottom-6 md:left-6">
      {abierto ? (
        <div className="absolute bottom-16 left-0 flex h-[28rem] max-h-[calc(100vh-8rem)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-accent" />
              Asistente
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar asistente"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {turnos.map((t, i) => (
              <div
                key={i}
                className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    t.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 text-foreground",
                  )}
                >
                  {t.content}
                  {t.enlaces && t.enlaces.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1">
                      {t.enlaces.map((e, j) => (
                        <Link
                          key={j}
                          href={e.href}
                          onClick={() => setAbierto(false)}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          {e.etiqueta} →
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  {t.pendiente && !t.resuelta ? (
                    <div className="mt-2 rounded-md border border-border bg-card p-2.5">
                      <p className="text-xs text-foreground">{t.pendiente.resumen}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => resolver(i, t.pendiente!, true)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
                        >
                          <Check className="size-3.5" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          disabled={cargando}
                          onClick={() => resolver(i, t.pendiente!, false)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                        >
                          <X className="size-3.5" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {cargando ? (
              <div className="flex justify-start">
                <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                  Pensando…
                </div>
              </div>
            ) : null}
            <div ref={finRef} />
          </div>

          <div className="border-t border-border p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                rows={1}
                placeholder="Escribe una orden o pregunta…"
                className="max-h-24 min-h-[2.5rem] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={enviar}
                disabled={cargando || !texto.trim()}
                aria-label="Enviar"
                className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Asistente del ERP"
        className={cn(
          "relative flex size-13 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105",
          abierto ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {abierto ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </button>
    </div>
  );
}

/** Evita repetir el mismo enlace si el modelo ejecutó varias herramientas. */
function dedupeEnlaces(enlaces: Enlace[]): Enlace[] {
  const vistos = new Set<string>();
  return enlaces.filter((e) => (vistos.has(e.href) ? false : (vistos.add(e.href), true)));
}
