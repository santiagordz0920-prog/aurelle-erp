"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, MessageSquareText, X } from "lucide-react";
import { aprobarBorrador, descartarBorrador } from "@/app/(app)/clientes/inbox/actions";
import { cn } from "@/lib/utils";

/*
  Widget flotante del Inbox (pedido de Fer 2026-07-11): burbuja fija abajo a la
  derecha en TODA la app. Muestra cuántas conversaciones necesitan atención
  (mensajes sin leer o borradores de la IA por aprobar), sondea /api/inbox/resumen
  cada 25 s y, si el navegador lo permite, avisa con una notificación cuando
  llega algo nuevo. Clic = panel con las conversaciones pendientes.
*/

type Item = {
  id: string;
  nombre: string | null;
  telefono: string;
  no_leidos: number;
  borradores: number;
  ultimo_at: string | null;
  borrador_id: string | null;
  borrador_texto: string | null;
};

const INTERVALO_MS = 25_000;

/*
  Aprobación at-a-glance (pedido de Fer 2026-07-11): el borrador del bot (p.ej.
  una propuesta de horario) se lee y se aprueba/descarta AQUÍ, desde cualquier
  pantalla, sin abrir el hilo. Para editar el texto antes de mandar, el nombre
  de arriba lleva al hilo (ahí está el flujo completo).
*/
function AprobarEnLinea({
  borradorId,
  texto,
  alResolver,
}: {
  borradorId: string;
  texto: string;
  alResolver: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resolver = (accion: "aprobar" | "descartar") =>
    start(async () => {
      setError(null);
      const r =
        accion === "aprobar"
          ? await aprobarBorrador(borradorId)
          : await descartarBorrador(borradorId);
      if (!r.ok) setError(r.error ?? "No se pudo.");
      alResolver();
    });

  return (
    <div className="mt-2 rounded-md border border-border bg-secondary/40 p-2.5">
      <p className="text-xs italic text-foreground">&ldquo;{texto}&rdquo;</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => resolver("aprobar")}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Check className="size-3.5" />
          {pending ? "Enviando…" : "Aprobar y enviar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => resolver("descartar")}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <X className="size-3.5" />
          Descartar
        </button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function InboxFlotante() {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState(false);
  const pendientesPrevios = useRef(0);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox/resumen", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: Item[]; pendientes?: number };
      const nuevos = data.items ?? [];
      setItems(nuevos);

      // Notificación del navegador solo cuando SUBE el número de pendientes.
      const pendientes = data.pendientes ?? 0;
      if (
        pendientes > pendientesPrevios.current &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("Aurelle - WhatsApp", {
            body:
              pendientes === 1
                ? "Hay una conversación esperando respuesta."
                : `Hay ${pendientes} conversaciones esperando respuesta.`,
            tag: "aurelle-inbox", // reemplaza la anterior, no acumula
          });
        } catch {
          // Algunos navegadores móviles no permiten Notification desde página.
        }
      }
      pendientesPrevios.current = pendientes;
    } catch {
      // Sin red o sin sesión: el widget simplemente no actualiza.
    }
  }, []);

  useEffect(() => {
    // La carga inicial va en un timeout 0: el linter de React 19 no permite
    // setState directo en el cuerpo del efecto (y el fetch es asíncrono igual).
    const inicial = setTimeout(cargar, 0);
    const timer = setInterval(cargar, INTERVALO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(inicial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  // Dentro del hilo de una conversación el widget estorba; en el resto, vive.
  if (pathname.startsWith("/clientes/inbox/")) return null;

  const totalNoLeidos = items.reduce((s, i) => s + i.no_leidos, 0);
  const totalBorradores = items.reduce((s, i) => s + i.borradores, 0);
  const atencion = items.length;

  const alternar = () => {
    const abrir = !abierto;
    setAbierto(abrir);
    if (abrir) {
      cargar();
      // Primer uso: pedir permiso de notificaciones (gesto del usuario).
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-30 print:hidden md:bottom-6 md:right-6">
      {abierto ? (
        <div className="absolute bottom-16 right-0 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            <Link
              href="/clientes/inbox"
              className="text-xs font-medium text-accent hover:underline"
              onClick={() => setAbierto(false)}
            >
              Ver todo el inbox
            </Link>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nada pendiente por contestar.
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {items.map((i) => (
                <li key={i.id} className="px-4 py-3">
                  <Link
                    href={`/clientes/inbox/${i.id}`}
                    onClick={() => setAbierto(false)}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground hover:underline">
                        {i.nombre ?? i.telefono}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[
                          i.no_leidos > 0
                            ? `${i.no_leidos} sin leer`
                            : null,
                          i.borradores > 0
                            ? `${i.borradores} ${i.borradores === 1 ? "borrador por aprobar" : "borradores por aprobar"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {i.no_leidos > 0 ? (
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                        {i.no_leidos}
                      </span>
                    ) : null}
                  </Link>
                  {i.borrador_id && i.borrador_texto ? (
                    <AprobarEnLinea
                      borradorId={i.borrador_id}
                      texto={i.borrador_texto}
                      alResolver={cargar}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={alternar}
        aria-label={
          atencion > 0
            ? `Inbox de WhatsApp: ${atencion} ${atencion === 1 ? "conversación pendiente" : "conversaciones pendientes"}`
            : "Inbox de WhatsApp"
        }
        className={cn(
          "relative flex size-13 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105",
          abierto
            ? "bg-secondary text-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {abierto ? (
          <X className="size-5" />
        ) : (
          <MessageSquareText className="size-5" />
        )}
        {!abierto && atencion > 0 ? (
          <>
            <span className="absolute -right-0.5 -top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
              {totalNoLeidos + totalBorradores > 9
                ? "9+"
                : totalNoLeidos + totalBorradores}
            </span>
            <span className="absolute -right-0.5 -top-0.5 size-5 animate-ping rounded-full bg-accent opacity-40" />
          </>
        ) : null}
      </button>
    </div>
  );
}
