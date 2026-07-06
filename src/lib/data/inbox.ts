import "server-only";
import type { Conversacion } from "@/lib/inbox";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { CONVERSACIONES_MUESTRA, MENSAJES_MUESTRA } from "./inbox-muestra";

/* Capa de datos del Inbox. RLS filtra por sucursal. */

export async function listarConversaciones(): Promise<Conversacion[]> {
  if (!supabaseConfigurado()) {
    return CONVERSACIONES_MUESTRA.slice()
      .map((c) => ({
        ...c,
        ultimo_cuerpo:
          MENSAJES_MUESTRA.filter((m) => m.conversacion_id === c.id).at(-1)?.cuerpo ?? null,
      }))
      .sort((a, b) => (b.ultimo_at ?? "").localeCompare(a.ultimo_at ?? ""));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversacion")
    .select("*, cliente(nombre)")
    .order("ultimo_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    cliente_nombre: Array.isArray(r.cliente) ? r.cliente[0]?.nombre : r.cliente?.nombre,
  })) as Conversacion[];
}

export async function getConversacion(id: string): Promise<Conversacion | null> {
  if (!supabaseConfigurado()) {
    const c = CONVERSACIONES_MUESTRA.find((x) => x.id === id);
    if (!c) return null;
    return {
      ...c,
      mensajes: MENSAJES_MUESTRA.filter((m) => m.conversacion_id === id).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      ),
    };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversacion")
    .select("*, cliente(nombre), mensaje(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  return {
    ...r,
    cliente_nombre: Array.isArray(r.cliente) ? r.cliente[0]?.nombre : r.cliente?.nombre,
    mensajes: (r.mensaje ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.created_at.localeCompare(b.created_at),
    ),
  } as Conversacion;
}

/** Total de conversaciones con mensajes sin leer (para el badge del inbox). */
export async function totalNoLeidos(): Promise<number> {
  const convs = await listarConversaciones();
  return convs.reduce((s, c) => s + (c.no_leidos > 0 ? 1 : 0), 0);
}
