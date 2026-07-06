"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { GastoRecurrente } from "@/lib/gastos";
import { GASTOS_MUESTRA } from "@/lib/data/gastos-muestra";

export type ResultadoAccion = { ok: boolean; error?: string; posteados?: number };

const gastoSchema = z.object({
  concepto: z.string().trim().min(2, "El concepto es obligatorio."),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
  categoria: z.string().trim().optional().nullable(),
  dia_cargo: z.coerce.number().int().min(1).max(28).default(1),
});

export async function crearGastoRecurrente(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  const parsed = gastoSchema.safeParse({
    concepto: formData.get("concepto"),
    monto: formData.get("monto"),
    categoria: (formData.get("categoria") as string) || null,
    dia_cargo: (formData.get("dia_cargo") as string) || 1,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    const nuevo: GastoRecurrente = {
      id: `e2000000-0000-0000-0000-0000000009${(GASTOS_MUESTRA.length + 10).toString().slice(-2)}`,
      concepto: d.concepto,
      monto: d.monto,
      categoria: d.categoria ?? null,
      periodicidad: "mensual",
      dia_cargo: d.dia_cargo,
      activo: true,
      ultimo_posteo: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    GASTOS_MUESTRA.unshift(nuevo);
    revalidatePath("/dinero/gastos");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gasto_recurrente").insert({
    concepto: d.concepto,
    monto: d.monto,
    categoria: d.categoria ?? null,
    dia_cargo: d.dia_cargo,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo guardar el gasto." };
  revalidatePath("/dinero/gastos");
  return { ok: true };
}

/** Activa/desactiva un gasto recurrente (deja de postearse sin borrarlo). */
export async function alternarGasto(id: string, activo: boolean): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  if (!supabaseConfigurado()) {
    const g = GASTOS_MUESTRA.find((x) => x.id === id);
    if (g) g.activo = activo;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("gasto_recurrente").update({ activo }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar." };
  }
  revalidatePath("/dinero/gastos");
  return { ok: true };
}

/** Postea manualmente los gastos del mes (respaldo del cron). Idempotente. */
export async function postearGastosDelMes(): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  if (!supabaseConfigurado()) {
    // En local simulamos el posteo marcando ultimo_posteo del mes.
    const primero = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    let n = 0;
    for (const g of GASTOS_MUESTRA) {
      if (g.activo && (!g.ultimo_posteo || g.ultimo_posteo < primero)) {
        g.ultimo_posteo = primero;
        n += 1;
      }
    }
    revalidatePath("/dinero/gastos");
    revalidatePath("/dinero");
    return { ok: true, posteados: n };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("postear_gastos_recurrentes");
  if (error) return { ok: false, error: "No se pudo postear." };
  revalidatePath("/dinero/gastos");
  revalidatePath("/dinero");
  return { ok: true, posteados: (data as number) ?? 0 };
}
