import "server-only";
import type { CanalFuente } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { CLIENTES_MUESTRA } from "./clientes-muestra";
import { CITAS_MUESTRA } from "./citas-muestra";
import { GASTOS_PUB_MUESTRA } from "./marketing-muestra";

/*
  Marketing v1 (§3.13): el funnel por fuente + gasto → CAC. Solo-admin (el gasto
  es dinero). El funnel se mide POR CLIENTE (cada lead progresa), agrupado por
  `fuente_canal`. Etapas: leads → con cita → visitaron → cotizaron → cerraron.
*/

const CANALES: CanalFuente[] = ["ads", "expo", "referido", "organico"];

export type FilaFunnel = {
  canal: CanalFuente;
  leads: number;
  conCita: number;
  visitaron: number;
  cotizaron: number;
  cerraron: number;
  ingreso: number; // Σ total de pedidos de clientes cerrados de este canal
  gasto: number; // gasto publicitario del canal (periodo filtrado)
};

/** Tasa segura (0 si el denominador es 0). */
export function tasa(num: number, den: number): number {
  return den > 0 ? num / den : 0;
}

type ClienteMin = { id: string; fuente_canal: CanalFuente | null; estado_pipeline: string };

function agregarFunnel(
  clientes: ClienteMin[],
  citasPorCliente: Map<string, string[]>, // cliente_id → resultados[]
  clientesConCotizacion: Set<string>,
  ingresoPorCliente: Map<string, number>,
  gastoPorCanal: Map<CanalFuente, number>,
): FilaFunnel[] {
  const base = new Map<CanalFuente, FilaFunnel>();
  for (const c of CANALES)
    base.set(c, {
      canal: c,
      leads: 0,
      conCita: 0,
      visitaron: 0,
      cotizaron: 0,
      cerraron: 0,
      ingreso: 0,
      gasto: gastoPorCanal.get(c) ?? 0,
    });

  for (const cli of clientes) {
    const canal = cli.fuente_canal;
    if (!canal || !base.has(canal)) continue;
    const f = base.get(canal)!;
    f.leads += 1;
    const resultados = citasPorCliente.get(cli.id) ?? [];
    if (resultados.length > 0) f.conCita += 1;
    if (resultados.some((r) => r === "asistio" || r === "cotizo" || r === "cerro")) f.visitaron += 1;
    const cotizo =
      clientesConCotizacion.has(cli.id) ||
      cli.estado_pipeline === "cotizado" ||
      cli.estado_pipeline === "cerrado";
    if (cotizo) f.cotizaron += 1;
    if (cli.estado_pipeline === "cerrado") {
      f.cerraron += 1;
      f.ingreso += ingresoPorCliente.get(cli.id) ?? 0;
    }
  }
  return CANALES.map((c) => base.get(c)!);
}

/** Funnel por fuente + gasto/CAC. Solo-admin. `periodo` opcional (YYYY-MM) filtra el gasto. */
export async function funnelPorFuente(periodo?: string): Promise<FilaFunnel[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    const citasPorCliente = new Map<string, string[]>();
    for (const c of CITAS_MUESTRA) {
      const arr = citasPorCliente.get(c.cliente_id) ?? [];
      if (c.resultado) arr.push(c.resultado);
      citasPorCliente.set(c.cliente_id, arr);
    }
    const gastoPorCanal = new Map<CanalFuente, number>();
    for (const g of GASTOS_PUB_MUESTRA) {
      if (periodo && !g.periodo.startsWith(periodo)) continue;
      gastoPorCanal.set(g.canal, (gastoPorCanal.get(g.canal) ?? 0) + g.monto);
    }
    const clientes: ClienteMin[] = CLIENTES_MUESTRA.map((c) => ({
      id: c.id,
      fuente_canal: c.fuente_canal,
      estado_pipeline: c.estado_pipeline,
    }));
    return agregarFunnel(clientes, citasPorCliente, new Set(), new Map(), gastoPorCanal);
  }

  const supabase = await createClient();
  const [clientesRes, citasRes, cotizRes, pedidosRes, gastoRes] = await Promise.all([
    supabase.from("cliente").select("id, fuente_canal, estado_pipeline"),
    supabase.from("cita").select("cliente_id, resultado"),
    supabase.from("cotizacion").select("cliente_id"),
    supabase.from("pedido").select("cliente_id, total, estado"),
    supabase.from("gasto_publicitario").select("canal, monto, periodo"),
  ]);

  const citasPorCliente = new Map<string, string[]>();
  for (const c of citasRes.data ?? []) {
    if (!c.cliente_id) continue;
    const arr = citasPorCliente.get(c.cliente_id) ?? [];
    if (c.resultado) arr.push(c.resultado);
    citasPorCliente.set(c.cliente_id, arr);
  }
  const clientesConCotizacion = new Set<string>();
  for (const c of cotizRes.data ?? []) if (c.cliente_id) clientesConCotizacion.add(c.cliente_id);
  const ingresoPorCliente = new Map<string, number>();
  for (const p of pedidosRes.data ?? []) {
    if (!p.cliente_id || p.estado === "cancelado") continue;
    ingresoPorCliente.set(p.cliente_id, (ingresoPorCliente.get(p.cliente_id) ?? 0) + Number(p.total ?? 0));
  }
  const gastoPorCanal = new Map<CanalFuente, number>();
  for (const g of gastoRes.data ?? []) {
    if (periodo && !String(g.periodo).startsWith(periodo)) continue;
    gastoPorCanal.set(g.canal as CanalFuente, (gastoPorCanal.get(g.canal as CanalFuente) ?? 0) + Number(g.monto ?? 0));
  }

  return agregarFunnel(
    (clientesRes.data ?? []) as ClienteMin[],
    citasPorCliente,
    clientesConCotizacion,
    ingresoPorCliente,
    gastoPorCanal,
  );
}
