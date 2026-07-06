"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Comision } from "@/lib/comisiones";
import { calcularComision } from "@/lib/comisiones";
import { getPedido } from "@/lib/data/pedidos";
import { COMISIONES_MUESTRA } from "@/lib/data/comisiones-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const comisionSchema = z.object({
  pedido_id: z.string().uuid("Elige un pedido."),
  beneficiario: z.string().trim().min(2, "El beneficiario es obligatorio."),
  tipo: z.enum(["planner", "referidor", "otro"]),
  porcentaje: z.coerce.number().positive("El % debe ser mayor a cero.").max(100, "Máximo 100%."),
});

export async function crearComision(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  const parsed = comisionSchema.safeParse({
    pedido_id: formData.get("pedido_id"),
    beneficiario: formData.get("beneficiario"),
    tipo: (formData.get("tipo") as string) || "referidor",
    porcentaje: formData.get("porcentaje"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  // La utilidad real (y por ende la comisión) se calcula en el servidor.
  const pedido = await getPedido(d.pedido_id);
  if (!pedido) return { ok: false, error: "Pedido no encontrado." };
  if (pedido.costo_real == null) {
    return {
      ok: false,
      error: "Captura el costo real del pedido antes de calcular la comisión.",
    };
  }
  const utilidad = pedido.total - pedido.costo_real;
  const monto = calcularComision(utilidad, d.porcentaje);

  if (!supabaseConfigurado()) {
    const nueva: Comision = {
      id: `d2000000-0000-0000-0000-0000000009${(COMISIONES_MUESTRA.length + 10).toString().slice(-2)}`,
      pedido_id: d.pedido_id,
      pedido_cliente: pedido.cliente_nombre ?? null,
      beneficiario: d.beneficiario,
      tipo: d.tipo,
      porcentaje: d.porcentaje,
      monto,
      estado: "devengada",
      pagada_at: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    COMISIONES_MUESTRA.unshift(nueva);
    revalidatePath("/dinero/comisiones");
    revalidatePath("/dinero");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("comision").insert({
    pedido_id: d.pedido_id,
    beneficiario: d.beneficiario,
    tipo: d.tipo,
    porcentaje: d.porcentaje,
    monto,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo registrar la comisión." };
  revalidatePath("/dinero/comisiones");
  revalidatePath("/dinero");
  return { ok: true };
}

export async function marcarPagadaComision(id: string): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };
  const ahora = new Date().toISOString();

  if (!supabaseConfigurado()) {
    const c = COMISIONES_MUESTRA.find((x) => x.id === id);
    if (c) {
      c.estado = "pagada";
      c.pagada_at = ahora;
    }
    revalidatePath("/dinero/comisiones");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("comision")
    .update({ estado: "pagada", pagada_at: ahora })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo marcar como pagada." };
  revalidatePath("/dinero/comisiones");
  return { ok: true };
}
