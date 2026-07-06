import "server-only";
import type { Cita } from "@/lib/citas";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { CITAS_MUESTRA } from "./citas-muestra";

/* Capa de datos de Citas. RLS filtra por sucursal. */

export type FiltroCitas = {
  cliente_id?: string;
  desde?: string; // ISO; inclusive
  hasta?: string; // ISO; exclusivo
  sala?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(r: any): Cita {
  const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
  return { ...r, cliente_nombre: cliente?.nombre ?? null } as Cita;
}

export async function listarCitas(filtro: FiltroCitas = {}): Promise<Cita[]> {
  if (!supabaseConfigurado()) {
    return CITAS_MUESTRA.filter(
      (c) =>
        (!filtro.cliente_id || c.cliente_id === filtro.cliente_id) &&
        (!filtro.sala || c.sala === filtro.sala) &&
        (!filtro.desde || c.inicio >= filtro.desde) &&
        (!filtro.hasta || c.inicio < filtro.hasta),
    )
      .slice()
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
  }
  const supabase = await createClient();
  let query = supabase
    .from("cita")
    .select("*, cliente(nombre)")
    .order("inicio", { ascending: true });
  if (filtro.cliente_id) query = query.eq("cliente_id", filtro.cliente_id);
  if (filtro.sala) query = query.eq("sala", filtro.sala);
  if (filtro.desde) query = query.gte("inicio", filtro.desde);
  if (filtro.hasta) query = query.lt("inicio", filtro.hasta);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizar);
}

/** Citas de hoy (para el Dashboard). Ordenadas por hora. */
export async function citasDeHoy(): Promise<Cita[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy.getTime() + 86400000);
  return listarCitas({ desde: hoy.toISOString(), hasta: manana.toISOString() });
}
