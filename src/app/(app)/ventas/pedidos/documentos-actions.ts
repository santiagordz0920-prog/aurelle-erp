"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Documento } from "@/lib/documentos";
import { DOCUMENTOS_MUESTRA } from "@/lib/data/documentos-muestra";
import { PEDIDOS_MUESTRA } from "@/lib/data/pedidos-muestra";

export type ResultadoDoc = { ok: boolean; error?: string; token?: string };

function nuevoToken(): string {
  return (randomUUID() + randomUUID()).replace(/-/g, "");
}

/** Genera un contrato para firma (estado 'enviado') y devuelve su token. */
export async function generarContrato(pedidoId: string): Promise<ResultadoDoc> {
  const usuario = await getUsuarioActual();
  const token = nuevoToken();

  if (!supabaseConfigurado()) {
    const ped = PEDIDOS_MUESTRA.find((p) => p.id === pedidoId);
    const doc: Documento = {
      id: `e3000000-0000-0000-0000-0000000009${(DOCUMENTOS_MUESTRA.length + 10).toString().slice(-2)}`,
      pedido_id: pedidoId,
      pedido_cliente: ped?.cliente_nombre ?? null,
      tipo: "contrato",
      token,
      estado: "enviado",
      version: 1,
      firmado_por: null,
      firmado_at: null,
      evidencia: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    DOCUMENTOS_MUESTRA.unshift(doc);
    revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true, token };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documento").insert({
    pedido_id: pedidoId,
    tipo: "contrato",
    token,
    estado: "enviado",
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo generar el contrato." };
  revalidatePath(`/ventas/pedidos/${pedidoId}`);
  return { ok: true, token };
}

/**
 * Genera el contrato automáticamente si el pedido no tiene ya uno activo
 * (borrador/enviado/firmado). Se dispara al confirmar el pedido. Idempotente:
 * no duplica contratos ni pisa uno firmado.
 */
export async function crearContratoSiNoExiste(pedidoId: string): Promise<ResultadoDoc> {
  const activos = new Set(["borrador", "enviado", "firmado"]);

  if (!supabaseConfigurado()) {
    const yaHay = DOCUMENTOS_MUESTRA.some(
      (d) => d.pedido_id === pedidoId && d.tipo === "contrato" && activos.has(d.estado),
    );
    if (yaHay) return { ok: true };
    return generarContrato(pedidoId);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("documento")
    .select("id")
    .eq("pedido_id", pedidoId)
    .eq("tipo", "contrato")
    .in("estado", ["borrador", "enviado", "firmado"])
    .limit(1);
  if (data && data.length > 0) return { ok: true };
  return generarContrato(pedidoId);
}

/** Cancela un documento (p. ej. si hubo cambios → se emite una adenda nueva). */
export async function cancelarDocumento(
  id: string,
  pedidoId: string,
): Promise<ResultadoDoc> {
  if (!supabaseConfigurado()) {
    const d = DOCUMENTOS_MUESTRA.find((x) => x.id === id);
    if (d) d.estado = "cancelado";
    revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("documento")
    .update({ estado: "cancelado" })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo cancelar." };
  revalidatePath(`/ventas/pedidos/${pedidoId}`);
  return { ok: true };
}
