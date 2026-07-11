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

export type FilaCampana = {
  campana: string; // fuente_detalle (o "Sin campaña")
  canal: CanalFuente | null;
  leads: number;
  visitaron: number;
  cerraron: number;
  ingreso: number;
  gasto: number;
};

const SIN_CAMPANA = "Sin campaña";
const claveCampana = (detalle: string | null | undefined) => (detalle?.trim() ? detalle.trim() : SIN_CAMPANA);

/**
 * Funnel por CAMPAÑA/zona (`fuente_detalle`) + CAC por campaña (§3.13). Solo-admin.
 * Cruza el gasto por `detalle` con los cierres de esa campaña. `periodo` (YYYY-MM)
 * opcional filtra el gasto.
 */
export async function funnelPorCampana(periodo?: string): Promise<FilaCampana[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  type CliCamp = { id: string; canal: CanalFuente | null; detalle: string | null; estado: string };
  let clientes: CliCamp[];
  const citasPorCliente = new Map<string, string[]>();
  const conCotizacion = new Set<string>();
  const ingresoPorCliente = new Map<string, number>();
  const gastoPorCampana = new Map<string, number>();

  if (!supabaseConfigurado()) {
    clientes = CLIENTES_MUESTRA.map((c) => ({
      id: c.id,
      canal: c.fuente_canal,
      detalle: c.fuente_detalle,
      estado: c.estado_pipeline,
    }));
    for (const c of CITAS_MUESTRA) {
      const arr = citasPorCliente.get(c.cliente_id) ?? [];
      if (c.resultado) arr.push(c.resultado);
      citasPorCliente.set(c.cliente_id, arr);
    }
    for (const g of GASTOS_PUB_MUESTRA) {
      if (periodo && !g.periodo.startsWith(periodo)) continue;
      const k = claveCampana(g.detalle);
      gastoPorCampana.set(k, (gastoPorCampana.get(k) ?? 0) + g.monto);
    }
  } else {
    const supabase = await createClient();
    const [cliRes, citasRes, cotizRes, pedRes, gastoRes] = await Promise.all([
      supabase.from("cliente").select("id, fuente_canal, fuente_detalle, estado_pipeline"),
      supabase.from("cita").select("cliente_id, resultado"),
      supabase.from("cotizacion").select("cliente_id"),
      supabase.from("pedido").select("cliente_id, total, estado"),
      supabase.from("gasto_publicitario").select("detalle, monto, periodo"),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientes = (cliRes.data ?? []).map((c: any) => ({
      id: c.id,
      canal: c.fuente_canal,
      detalle: c.fuente_detalle,
      estado: c.estado_pipeline,
    }));
    for (const c of citasRes.data ?? []) {
      if (!c.cliente_id) continue;
      const arr = citasPorCliente.get(c.cliente_id) ?? [];
      if (c.resultado) arr.push(c.resultado);
      citasPorCliente.set(c.cliente_id, arr);
    }
    for (const c of cotizRes.data ?? []) if (c.cliente_id) conCotizacion.add(c.cliente_id);
    for (const p of pedRes.data ?? []) {
      if (!p.cliente_id || p.estado === "cancelado") continue;
      ingresoPorCliente.set(p.cliente_id, (ingresoPorCliente.get(p.cliente_id) ?? 0) + Number(p.total ?? 0));
    }
    for (const g of gastoRes.data ?? []) {
      if (periodo && !String(g.periodo).startsWith(periodo)) continue;
      const k = claveCampana(g.detalle);
      gastoPorCampana.set(k, (gastoPorCampana.get(k) ?? 0) + Number(g.monto ?? 0));
    }
  }

  const base = new Map<string, FilaCampana>();
  const asegura = (k: string, canal: CanalFuente | null) => {
    if (!base.has(k))
      base.set(k, { campana: k, canal, leads: 0, visitaron: 0, cerraron: 0, ingreso: 0, gasto: 0 });
    return base.get(k)!;
  };
  for (const cli of clientes) {
    if (!cli.canal) continue; // sin fuente no entra al funnel
    const f = asegura(claveCampana(cli.detalle), cli.canal);
    f.leads += 1;
    const res = citasPorCliente.get(cli.id) ?? [];
    if (res.some((r) => r === "asistio" || r === "cotizo" || r === "cerro")) f.visitaron += 1;
    if (cli.estado === "cerrado") {
      f.cerraron += 1;
      f.ingreso += ingresoPorCliente.get(cli.id) ?? 0;
    }
  }
  // Campañas con gasto pero sin leads aún: también se listan.
  for (const [k, monto] of gastoPorCampana) asegura(k, null).gasto = monto;
  for (const [k, f] of base) f.gasto = gastoPorCampana.get(k) ?? 0;

  return [...base.values()].sort((a, b) => b.leads - a.leads || b.gasto - a.gasto);
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
