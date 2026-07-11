import "server-only";
import type { Expo } from "@/lib/expos";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { EXPOS_MUESTRA } from "./expos-muestra";
import { CLIENTES_MUESTRA } from "./clientes-muestra";
import { CITAS_MUESTRA } from "./citas-muestra";
import { PEDIDOS_MUESTRA } from "./pedidos-muestra";

/*
  Capa de datos de Expos (§3.14) con ROI. El ROI casa `cliente.fuente_detalle`
  (nombre de la expo) con `expo.nombre` para contar leads → visitas → cierres →
  ingreso. Solo-admin (área Crecimiento; el costo es dinero).
*/

type LeadStats = { leads: number; visitaron: number; cerraron: number; ingreso: number };

/** Estadísticas de conversión por nombre de expo (clientes con fuente_detalle = nombre). */
async function statsPorExpo(): Promise<Map<string, LeadStats>> {
  const porNombre = new Map<string, LeadStats>();
  const bump = (k: string, campo: keyof LeadStats, v = 1) => {
    const s = porNombre.get(k) ?? { leads: 0, visitaron: 0, cerraron: 0, ingreso: 0 };
    s[campo] += v;
    porNombre.set(k, s);
  };

  if (!supabaseConfigurado()) {
    const visitadoPorCliente = new Set(
      CITAS_MUESTRA.filter((c) => ["asistio", "cotizo", "cerro"].includes(c.resultado ?? "")).map(
        (c) => c.cliente_id,
      ),
    );
    const ingresoPorCliente = new Map<string, number>();
    for (const p of PEDIDOS_MUESTRA) {
      if (!p.cliente_id || p.estado === "cancelado") continue;
      ingresoPorCliente.set(p.cliente_id, (ingresoPorCliente.get(p.cliente_id) ?? 0) + p.total);
    }
    for (const c of CLIENTES_MUESTRA) {
      if (c.fuente_canal !== "expo" || !c.fuente_detalle) continue;
      const k = c.fuente_detalle.trim();
      bump(k, "leads");
      if (visitadoPorCliente.has(c.id)) bump(k, "visitaron");
      if (c.estado_pipeline === "cerrado") {
        bump(k, "cerraron");
        bump(k, "ingreso", ingresoPorCliente.get(c.id) ?? 0);
      }
    }
    return porNombre;
  }

  const supabase = await createClient();
  const [cliRes, citasRes, pedRes] = await Promise.all([
    supabase.from("cliente").select("id, fuente_canal, fuente_detalle, estado_pipeline"),
    supabase.from("cita").select("cliente_id, resultado"),
    supabase.from("pedido").select("cliente_id, total, estado"),
  ]);
  const visitado = new Set<string>();
  for (const c of citasRes.data ?? [])
    if (c.cliente_id && ["asistio", "cotizo", "cerro"].includes(c.resultado ?? "")) visitado.add(c.cliente_id);
  const ingresoPorCliente = new Map<string, number>();
  for (const p of pedRes.data ?? []) {
    if (!p.cliente_id || p.estado === "cancelado") continue;
    ingresoPorCliente.set(p.cliente_id, (ingresoPorCliente.get(p.cliente_id) ?? 0) + Number(p.total ?? 0));
  }
  for (const c of cliRes.data ?? []) {
    if (c.fuente_canal !== "expo" || !c.fuente_detalle) continue;
    const k = String(c.fuente_detalle).trim();
    bump(k, "leads");
    if (visitado.has(c.id)) bump(k, "visitaron");
    if (c.estado_pipeline === "cerrado") {
      bump(k, "cerraron");
      bump(k, "ingreso", ingresoPorCliente.get(c.id) ?? 0);
    }
  }
  return porNombre;
}

/** Todas las expos con su ROI. Solo-admin. */
export async function listarExpos(): Promise<Expo[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];
  const stats = await statsPorExpo();

  const conRoi = (e: Expo): Expo => {
    const s = stats.get(e.nombre.trim());
    return { ...e, leads: s?.leads ?? 0, visitaron: s?.visitaron ?? 0, cerraron: s?.cerraron ?? 0, ingreso: s?.ingreso ?? 0 };
  };

  if (!supabaseConfigurado()) {
    return EXPOS_MUESTRA.map(conRoi);
  }
  const supabase = await createClient();
  const { data } = await supabase.from("expo").select("*").order("fecha_inicio", { ascending: false, nullsFirst: false });
  return (data ?? []).map((e) => conRoi(e as Expo));
}
