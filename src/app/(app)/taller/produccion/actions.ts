"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { EtapaProduccion, CostoProduccion, OrdenProduccion } from "@/lib/produccion";
import { ETAPA_PRODUCCION, diasEnEtapa } from "@/lib/produccion";
import type { Tarea } from "@/lib/tareas";
import { listarUsuarios } from "@/lib/data/usuarios";
import { ORDENES_MUESTRA, COSTOS_PROD_MUESTRA } from "@/lib/data/produccion-muestra";
import { PEDIDOS_MUESTRA } from "@/lib/data/pedidos-muestra";
import { TAREAS_MUESTRA } from "@/lib/data/tareas-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar(ordenId?: string) {
  revalidatePath("/taller/produccion");
  if (ordenId) revalidatePath(`/taller/produccion/${ordenId}`);
  revalidatePath("/hoy");
}

/** Fija el estado del pedido según la etapa de su orden (matriz §4). */
async function sincronizarPedido(pedidoId: string, etapa: EtapaProduccion) {
  const nuevo =
    etapa === "listo_entrega" ? "listo_entrega" : "en_produccion";
  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === pedidoId);
    if (p && p.estado !== "entregado" && p.estado !== "cancelado") p.estado = nuevo;
    return;
  }
  const supabase = await createClient();
  await supabase
    .from("pedido")
    .update({ estado: nuevo })
    .eq("id", pedidoId)
    .not("estado", "in", "(entregado,cancelado)");
}

/** Crea la orden de producción de un pedido (una por pedido). */
export async function crearOrden(pedidoId: string): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    if (ORDENES_MUESTRA.some((o) => o.pedido_id === pedidoId)) {
      return { ok: false, error: "Este pedido ya tiene orden de producción." };
    }
    const ped = PEDIDOS_MUESTRA.find((p) => p.id === pedidoId);
    const nueva: OrdenProduccion = {
      id: `a1100000-0000-0000-0000-0000000009${(ORDENES_MUESTRA.length + 10).toString().slice(-2)}`,
      pedido_id: pedidoId,
      pedido_cliente: ped?.cliente_nombre ?? null,
      linea_negocio: ped?.linea_negocio ?? null,
      etapa: "diseno",
      responsable_id: null,
      responsable_nombre: null,
      fecha_compromiso: ped?.fecha_compromiso ?? null,
      qc_ok: false,
      notas: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    ORDENES_MUESTRA.unshift(nueva);
    await sincronizarPedido(pedidoId, "diseno");
    revalidar(nueva.id);
    revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: ped } = await supabase
    .from("pedido")
    .select("fecha_compromiso")
    .eq("id", pedidoId)
    .maybeSingle();
  const { data: orden, error } = await supabase
    .from("orden_produccion")
    .insert({
      pedido_id: pedidoId,
      fecha_compromiso: ped?.fecha_compromiso ?? null,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return { ok: false, error: dup ? "Este pedido ya tiene orden." : "No se pudo crear la orden." };
  }
  await supabase.from("orden_movimiento").insert({
    orden_id: orden.id,
    etapa_hasta: "diseno",
    movido_por: usuario.id,
  });
  await sincronizarPedido(pedidoId, "diseno");
  revalidar(orden.id);
  revalidatePath(`/ventas/pedidos/${pedidoId}`);
  return { ok: true };
}

/** Mueve la orden a una etapa. Candado: a 'listo_entrega' solo con QC completo. */
export async function moverEtapa(
  ordenId: string,
  etapa: EtapaProduccion,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();

  // Leer la orden (para QC y pedido).
  const orden = supabaseConfigurado()
    ? await (await createClient())
        .from("orden_produccion")
        .select("etapa, qc_ok, pedido_id")
        .eq("id", ordenId)
        .maybeSingle()
        .then((r) => r.data)
    : ORDENES_MUESTRA.find((o) => o.id === ordenId);
  if (!orden) return { ok: false, error: "Orden no encontrada." };
  if (etapa === "listo_entrega" && !orden.qc_ok) {
    return { ok: false, error: "Falta completar el QC antes de marcar listo para entrega." };
  }

  if (!supabaseConfigurado()) {
    const o = ORDENES_MUESTRA.find((x) => x.id === ordenId)!;
    o.etapa = etapa;
    o.updated_at = new Date().toISOString();
    await sincronizarPedido(o.pedido_id, etapa);
    revalidar(ordenId);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orden_produccion")
    .update({ etapa })
    .eq("id", ordenId);
  if (error) return { ok: false, error: "No se pudo mover de etapa." };
  await supabase.from("orden_movimiento").insert({
    orden_id: ordenId,
    etapa_desde: orden.etapa,
    etapa_hasta: etapa,
    movido_por: usuario.id,
  });
  // Reacción §4: si etapa clave → lifecycle avisa (pendiente, requiere riel WhatsApp).
  await sincronizarPedido(orden.pedido_id, etapa);
  revalidar(ordenId);
  return { ok: true };
}

/** Asigna (o quita) el responsable del taller de una orden. */
export async function asignarResponsable(
  ordenId: string,
  responsableId: string | null,
): Promise<ResultadoAccion> {
  const usuarios = await listarUsuarios();
  const nombre = responsableId
    ? (usuarios.find((u) => u.id === responsableId)?.nombre ?? null)
    : null;

  if (!supabaseConfigurado()) {
    const o = ORDENES_MUESTRA.find((x) => x.id === ordenId);
    if (o) {
      o.responsable_id = responsableId;
      o.responsable_nombre = nombre;
    }
    revalidar(ordenId);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("orden_produccion")
    .update({ responsable_id: responsableId })
    .eq("id", ordenId);
  if (error) return { ok: false, error: "No se pudo asignar el responsable." };
  revalidar(ordenId);
  return { ok: true };
}

/** Crea una tarea de seguimiento por atasco (≥7d en una etapa). Ligada al pedido. */
export async function crearTareaAtasco(ordenId: string): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();

  // Leer datos de la orden para armar la tarea.
  const orden = supabaseConfigurado()
    ? await (await createClient())
        .from("orden_produccion")
        .select("etapa, updated_at, responsable_id, pedido_id, pedido:pedido_id(cliente(nombre))")
        .eq("id", ordenId)
        .maybeSingle()
        .then((r) => r.data)
    : ORDENES_MUESTRA.find((o) => o.id === ordenId);
  if (!orden) return { ok: false, error: "Orden no encontrada." };

  const dias = diasEnEtapa(orden.updated_at);
  const etapaLbl = ETAPA_PRODUCCION[orden.etapa as EtapaProduccion].etiqueta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rel = orden as any;
  const cliente =
    rel.pedido_cliente ??
    (Array.isArray(rel.pedido)
      ? rel.pedido[0]?.cliente?.nombre
      : rel.pedido?.cliente?.nombre) ??
    "cliente";
  const titulo = `Atasco en producción: ${cliente}`;
  const detalle = `La orden lleva ${dias} días en la etapa "${etapaLbl}". Da seguimiento con el taller.`;
  const responsable = orden.responsable_id ?? usuario.id;

  if (!supabaseConfigurado()) {
    const nueva: Tarea = {
      id: `d1000000-0000-0000-0000-0000000009${(TAREAS_MUESTRA.length + 20).toString().slice(-2)}`,
      titulo,
      detalle,
      responsable_id: responsable,
      responsable_nombre: null,
      prioridad: "alta",
      estado: "pendiente",
      fecha_vencimiento: null,
      entidad_tipo: "pedido",
      entidad_id: orden.pedido_id,
      origen: "sugerida",
      completada_at: null,
      creada_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    TAREAS_MUESTRA.unshift(nueva);
    revalidar(ordenId);
    revalidatePath("/hoy/tareas");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tarea").insert({
    titulo,
    detalle,
    responsable_id: responsable,
    prioridad: "alta",
    entidad_tipo: "pedido",
    entidad_id: orden.pedido_id,
    origen: "sugerida",
    creada_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo crear la tarea." };
  revalidar(ordenId);
  revalidatePath("/hoy/tareas");
  return { ok: true };
}

export async function marcarQC(ordenId: string, ok: boolean): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const o = ORDENES_MUESTRA.find((x) => x.id === ordenId);
    if (o) o.qc_ok = ok;
    revalidar(ordenId);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("orden_produccion").update({ qc_ok: ok }).eq("id", ordenId);
  if (error) return { ok: false, error: "No se pudo actualizar el QC." };
  revalidar(ordenId);
  return { ok: true };
}

const costoSchema = z.object({
  orden_id: z.string().uuid(),
  tipo: z.enum(["casting", "engaste", "material", "mano_obra", "otro"]),
  concepto: z.string().trim().min(2, "El concepto es obligatorio."),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
});

/** Captura un costo de producción → el trigger recomputa el costo_real del pedido. */
export async function agregarCostoProduccion(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  const parsed = costoSchema.safeParse({
    orden_id: formData.get("orden_id"),
    tipo: formData.get("tipo"),
    concepto: formData.get("concepto"),
    monto: formData.get("monto"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    const costo: CostoProduccion = {
      id: `cp100000-0000-0000-0000-0000000009${(COSTOS_PROD_MUESTRA.length + 10).toString().slice(-2)}`,
      orden_id: d.orden_id,
      tipo: d.tipo,
      concepto: d.concepto,
      monto: d.monto,
      registrado_por: usuario.id,
      created_at: new Date().toISOString(),
    };
    COSTOS_PROD_MUESTRA.unshift(costo);
    // Reflejar el efecto del trigger: sumar al costo_real del pedido de la orden.
    const orden = ORDENES_MUESTRA.find((o) => o.id === d.orden_id);
    if (orden) {
      const total = COSTOS_PROD_MUESTRA.filter((c) => {
        const oo = ORDENES_MUESTRA.find((x) => x.id === c.orden_id);
        return oo?.pedido_id === orden.pedido_id;
      }).reduce((s, c) => s + c.monto, 0);
      const ped = PEDIDOS_MUESTRA.find((p) => p.id === orden.pedido_id);
      if (ped) ped.costo_real = total;
    }
    revalidar(d.orden_id);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("costo_produccion").insert({
    orden_id: d.orden_id,
    tipo: d.tipo,
    concepto: d.concepto,
    monto: d.monto,
    registrado_por: usuario.id,
  });
  if (error) return { ok: false, error: "No se pudo guardar el costo." };
  revalidar(d.orden_id);
  return { ok: true };
}
