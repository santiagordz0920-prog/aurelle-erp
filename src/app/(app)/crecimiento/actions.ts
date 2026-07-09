"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { GASTOS_PUB_MUESTRA } from "@/lib/data/marketing-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const gastoSchema = z.object({
  periodo_mes: z.string().regex(/^\d{4}-\d{2}$/, "Elige un mes."),
  canal: z.enum(["ads", "expo", "referido", "organico"]),
  detalle: z.string().trim().optional(),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
});

/** Registra un gasto de publicidad del mes (solo-admin; la RLS también lo impone). */
export async function registrarGasto(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = gastoSchema.safeParse({
    periodo_mes: formData.get("periodo_mes"),
    canal: formData.get("canal"),
    detalle: formData.get("detalle"),
    monto: formData.get("monto"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const periodo = `${d.periodo_mes}-01`;

  if (!supabaseConfigurado()) {
    GASTOS_PUB_MUESTRA.push({
      id: `g0000000-0000-0000-0000-0000000000${(GASTOS_PUB_MUESTRA.length + 10).toString().slice(-2)}`,
      periodo,
      canal: d.canal,
      detalle: d.detalle || null,
      monto: d.monto,
    });
    revalidatePath("/crecimiento");
    return { ok: true };
  }

  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo un admin puede capturar gasto." };
  const supabase = await createClient();
  const { error } = await supabase.from("gasto_publicitario").insert({
    periodo,
    canal: d.canal,
    detalle: d.detalle || null,
    monto: d.monto,
    creado_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo registrar el gasto." };
  revalidatePath("/crecimiento");
  return { ok: true };
}
