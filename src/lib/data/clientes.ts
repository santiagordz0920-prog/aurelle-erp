import "server-only";
import type { Cliente, NotaCliente, EstadoPipeline } from "@/lib/clientes";
import {
  type FechaClave,
  aniosEnProxima,
  diasHastaAniversario,
  hoyMonterrey,
} from "@/lib/fechas-clave";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { CLIENTES_MUESTRA, NOTAS_MUESTRA } from "./clientes-muestra";

/*
  Capa de acceso a datos del CRM. En producción usa Supabase (RLS filtra por
  sucursal y rol automáticamente). En local sin llaves usa datos de muestra.
*/

function filtrar(clientes: Cliente[], q?: string): Cliente[] {
  if (!q) return clientes;
  const t = q.toLowerCase();
  return clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(t) ||
      (c.telefono ?? "").toLowerCase().includes(t) ||
      (c.fuente_detalle ?? "").toLowerCase().includes(t) ||
      c.etiquetas.some((e) => e.toLowerCase().includes(t)),
  );
}

export async function listarClientes(q?: string): Promise<Cliente[]> {
  if (!supabaseConfigurado()) {
    return filtrar(CLIENTES_MUESTRA, q).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  const supabase = await createClient();
  let query = supabase
    .from("cliente")
    .select("*")
    .order("created_at", { ascending: false });
  if (q) {
    query = query.or(
      `nombre.ilike.%${q}%,telefono.ilike.%${q}%,fuente_detalle.ilike.%${q}%`,
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  if (!supabaseConfigurado()) {
    return CLIENTES_MUESTRA.find((c) => c.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("cliente")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Cliente) ?? null;
}

export async function getNotas(clienteId: string): Promise<NotaCliente[]> {
  if (!supabaseConfigurado()) {
    return NOTAS_MUESTRA.filter((n) => n.cliente_id === clienteId).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("nota_cliente")
    .select("id, cliente_id, autor_id, texto, created_at, autor:usuario(nombre)")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(
    (n: {
      id: string;
      cliente_id: string;
      autor_id: string | null;
      texto: string;
      created_at: string;
      autor?: { nombre: string } | { nombre: string }[] | null;
    }) => ({
      id: n.id,
      cliente_id: n.cliente_id,
      autor_id: n.autor_id,
      texto: n.texto,
      created_at: n.created_at,
      autor_nombre: Array.isArray(n.autor)
        ? (n.autor[0]?.nombre ?? null)
        : (n.autor?.nombre ?? null),
    }),
  );
}

/**
 * Cumpleaños y aniversarios de boda dentro de una ventana de días.
 * Corre sobre los clientes visibles (RLS por sucursal en prod). Ordenado por
 * cercanía. Alimenta el saludo asistido por WhatsApp (plantillas del CRM).
 */
export async function fechasClaveProximas(ventanaDias = 14): Promise<FechaClave[]> {
  const clientes = await listarClientes();
  const hoy = hoyMonterrey();
  const eventos = clientes.flatMap((c) => {
    const out: FechaClave[] = [];
    if (c.fecha_nacimiento) {
      const dias = diasHastaAniversario(c.fecha_nacimiento, hoy);
      if (dias !== null && dias <= ventanaDias) {
        out.push({
          cliente_id: c.id,
          cliente_nombre: c.nombre,
          telefono: c.telefono,
          tipo: "cumpleanos",
          pareja: c.pareja_nombre,
          fecha: c.fecha_nacimiento,
          dias,
          anios: aniosEnProxima(c.fecha_nacimiento, hoy),
        });
      }
    }
    if (c.fecha_boda) {
      const dias = diasHastaAniversario(c.fecha_boda, hoy);
      if (dias !== null && dias <= ventanaDias) {
        out.push({
          cliente_id: c.id,
          cliente_nombre: c.nombre,
          telefono: c.telefono,
          tipo: "aniversario",
          pareja: c.pareja_nombre,
          fecha: c.fecha_boda,
          dias,
          anios: aniosEnProxima(c.fecha_boda, hoy),
        });
      }
    }
    return out;
  });
  return eventos.sort(
    (a, b) => a.dias - b.dias || a.cliente_nombre.localeCompare(b.cliente_nombre),
  );
}

/** Conteo por estado para el tablero de pipeline. */
export async function contarPorEstado(): Promise<
  Record<EstadoPipeline, number>
> {
  const clientes = await listarClientes();
  const base = {
    nuevo: 0,
    conversando: 0,
    cita_agendada: 0,
    visito: 0,
    cotizado: 0,
    cerrado: 0,
    perdido: 0,
  } as Record<EstadoPipeline, number>;
  for (const c of clientes) base[c.estado_pipeline] += 1;
  return base;
}
