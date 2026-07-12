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
import { CONVERSACIONES_MUESTRA, MENSAJES_MUESTRA } from "./inbox-muestra";

/*
  Capa de acceso a datos del CRM. En producción usa Supabase (RLS filtra por
  sucursal y rol automáticamente). En local sin llaves usa datos de muestra.
*/

function filtrar(clientes: Cliente[], q?: string, etapa?: EstadoPipeline): Cliente[] {
  const base = etapa ? clientes.filter((c) => c.estado_pipeline === etapa) : clientes;
  if (!q) return base;
  const t = q.toLowerCase();
  // Búsqueda de teléfono insensible a espacios/guiones: se comparan solo dígitos.
  const telQ = q.replace(/\D/g, "");
  return base.filter(
    (c) =>
      c.nombre.toLowerCase().includes(t) ||
      (telQ.length >= 4 && (c.telefono ?? "").replace(/\D/g, "").includes(telQ)) ||
      (c.correo ?? "").toLowerCase().includes(t) ||
      (c.instagram ?? "").toLowerCase().includes(t) ||
      (c.fuente_detalle ?? "").toLowerCase().includes(t) ||
      c.etiquetas.some((e) => e.toLowerCase().includes(t)),
  );
}

export async function listarClientes(
  q?: string,
  etapa?: EstadoPipeline,
): Promise<Cliente[]> {
  if (!supabaseConfigurado()) {
    return filtrar(CLIENTES_MUESTRA, q, etapa).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  const supabase = await createClient();
  let query = supabase
    .from("cliente")
    .select("*")
    .order("created_at", { ascending: false });
  if (etapa) query = query.eq("estado_pipeline", etapa);
  if (q) {
    // Comas/paréntesis rompen la sintaxis de or() de PostgREST.
    const qs = q.replace(/[,()]/g, " ").trim();
    const filtros = [
      `nombre.ilike.%${qs}%`,
      `fuente_detalle.ilike.%${qs}%`,
      `correo.ilike.%${qs}%`,
      `instagram.ilike.%${qs}%`,
    ];
    // Teléfonos guardados sin espacios (0037): buscar por solo-dígitos del query.
    const telQ = q.replace(/\D/g, "");
    if (telQ.length >= 4) filtros.push(`telefono.ilike.%${telQ}%`);
    if (qs) query = query.or(filtros.join(","));
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Cliente[];
}

/*
  Lista de leads at-a-glance (feedback de Santiago 2026-07-11): cada cliente con
  su última interacción de WhatsApp, mensajes sin contestar y respuestas de IA
  esperando aprobación — para que /clientes diga de un vistazo quién necesita
  atención y qué busca cada quien.
*/
export type LeadResumen = Cliente & {
  conversacion_id: string | null;
  ultima_interaccion: string | null;
  no_leidos: number;
  borradores: number;
};

export async function listarLeads(
  q?: string,
  etapa?: EstadoPipeline,
): Promise<LeadResumen[]> {
  const clientes = await listarClientes(q, etapa);
  if (clientes.length === 0) return [];

  if (!supabaseConfigurado()) {
    return clientes.map((c) => {
      const conv = CONVERSACIONES_MUESTRA.find((x) => x.cliente_id === c.id);
      const borradores = conv
        ? MENSAJES_MUESTRA.filter(
            (m) => m.conversacion_id === conv.id && m.estado_entrega === "borrador_ia",
          ).length
        : 0;
      return {
        ...c,
        conversacion_id: conv?.id ?? null,
        ultima_interaccion: conv?.ultimo_at ?? null,
        no_leidos: conv?.no_leidos ?? 0,
        borradores,
      };
    });
  }

  const supabase = await createClient();
  const { data: convs } = await supabase
    .from("conversacion")
    .select("id, cliente_id, ultimo_at, no_leidos")
    .in("cliente_id", clientes.map((c) => c.id));

  type ConvMini = { id: string; cliente_id: string; ultimo_at: string | null; no_leidos: number };
  const porCliente = new Map<string, ConvMini>();
  for (const cv of (convs ?? []) as ConvMini[]) {
    const previa = porCliente.get(cv.cliente_id);
    if (!previa || (cv.ultimo_at ?? "") > (previa.ultimo_at ?? "")) {
      porCliente.set(cv.cliente_id, cv);
    }
  }

  // Borradores de IA pendientes por conversación (cola de aprobación).
  const borradoresPorConv = new Map<string, number>();
  const convIds = [...porCliente.values()].map((cv) => cv.id);
  if (convIds.length > 0) {
    const { data: borradores } = await supabase
      .from("mensaje")
      .select("conversacion_id")
      .eq("estado_entrega", "borrador_ia")
      .in("conversacion_id", convIds);
    for (const b of borradores ?? []) {
      borradoresPorConv.set(
        b.conversacion_id,
        (borradoresPorConv.get(b.conversacion_id) ?? 0) + 1,
      );
    }
  }

  return clientes.map((c) => {
    const conv = porCliente.get(c.id);
    return {
      ...c,
      conversacion_id: conv?.id ?? null,
      ultima_interaccion: conv?.ultimo_at ?? null,
      no_leidos: conv?.no_leidos ?? 0,
      borradores: conv ? (borradoresPorConv.get(conv.id) ?? 0) : 0,
    };
  });
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
