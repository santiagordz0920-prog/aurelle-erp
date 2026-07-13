"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { MovimientoFinanciero } from "@/lib/finanzas";
import { CXP_MUESTRA, MOVIMIENTOS_MUESTRA } from "@/lib/data/finanzas-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const movimientoSchema = z.object({
  categoria: z.enum(["deuda", "gasto", "capital", "ingreso", "costo", "pago_deuda", "transferencia_interna"]),
  concepto: z.string().trim().min(2, "El concepto es obligatorio."),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
  fecha: z.string().optional().nullable(),
  linea_negocio: z.enum(["bridal", "concierge"]).optional().nullable(),
  folio_factura: z.string().trim().optional().nullable(),
});

/** Captura manual de un movimiento en el ledger. Solo-admin. */
export async function crearMovimiento(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  const parsed = movimientoSchema.safeParse({
    categoria: formData.get("categoria"),
    concepto: formData.get("concepto"),
    monto: formData.get("monto"),
    fecha: (formData.get("fecha") as string) || null,
    linea_negocio: (formData.get("linea_negocio") as string) || null,
    folio_factura: (formData.get("folio_factura") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const fecha = d.fecha || new Date().toISOString().slice(0, 10);

  if (!supabaseConfigurado()) {
    const nuevo: MovimientoFinanciero = {
      id: `a0000000-0000-0000-0000-0000000009${(MOVIMIENTOS_MUESTRA.length + 10).toString().slice(-2)}`,
      fecha,
      categoria: d.categoria,
      concepto: d.concepto,
      monto: d.monto,
      linea_negocio: d.linea_negocio ?? null,
      pedido_id: null,
      pago_id: null,
      origen: "manual",
      folio_factura: d.folio_factura ?? null,
      registrado_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOVIMIENTOS_MUESTRA.unshift(nuevo);
    revalidatePath("/dinero");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("movimiento_financiero").insert({
    fecha,
    categoria: d.categoria,
    concepto: d.concepto,
    monto: d.monto,
    linea_negocio: d.linea_negocio ?? null,
    origen: "manual",
    folio_factura: d.folio_factura ?? null,
    registrado_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo guardar el movimiento." };
  revalidatePath("/dinero");
  return { ok: true };
}

/** Marca una cuenta por pagar como pagada (registra egreso opcional a futuro). */
export async function marcarPagadaCxP(id: string): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };
  const ahora = new Date().toISOString();

  if (!supabaseConfigurado()) {
    const c = CXP_MUESTRA.find((x) => x.id === id);
    if (c) {
      c.estado = "pagada";
      c.pagada_at = ahora;
    }
    revalidatePath("/dinero");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cuenta_por_pagar")
    .update({ estado: "pagada", pagada_at: ahora })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo marcar como pagada." };
  revalidatePath("/dinero");
  return { ok: true };
}
