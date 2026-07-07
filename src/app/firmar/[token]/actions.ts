"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { DOCUMENTOS_MUESTRA } from "@/lib/data/documentos-muestra";

export type ResultadoFirma = { ok: boolean; error?: string };

const firmaSchema = z.object({
  token: z.string().min(8),
  nombre: z.string().trim().min(3, "Escribe tu nombre completo."),
  acepto: z.string().refine((v) => v === "on" || v === "true", {
    message: "Debes aceptar los términos para firmar.",
  }),
});

/**
 * Firma pública (sin cuenta). Valida el token, registra nombre + fecha/hora +
 * evidencia (user-agent) y marca el documento como firmado. Usa service_role.
 */
export async function firmarDocumento(
  _prev: ResultadoFirma,
  formData: FormData,
): Promise<ResultadoFirma> {
  const parsed = firmaSchema.safeParse({
    token: formData.get("token"),
    nombre: formData.get("nombre"),
    acepto: formData.get("acepto"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const { token, nombre } = parsed.data;
  const h = await headers();
  const evidencia = {
    user_agent: h.get("user-agent") ?? null,
    firmado_desde: h.get("x-forwarded-for") ?? null,
    at: new Date().toISOString(),
  };

  if (!supabaseConfigurado()) {
    const d = DOCUMENTOS_MUESTRA.find((x) => x.token === token);
    if (!d) return { ok: false, error: "Documento no encontrado." };
    if (d.estado === "firmado") return { ok: false, error: "Este documento ya fue firmado." };
    d.estado = "firmado";
    d.firmado_por = nombre;
    d.firmado_at = new Date().toISOString();
    d.evidencia = evidencia;
    revalidatePath(`/firmar/${token}`);
    return { ok: true };
  }

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("documento")
    .select("id, estado")
    .eq("token", token)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento no encontrado." };
  if (doc.estado === "firmado") return { ok: false, error: "Este documento ya fue firmado." };
  if (doc.estado === "cancelado") return { ok: false, error: "Este documento fue cancelado." };

  const { error } = await supabase
    .from("documento")
    .update({
      estado: "firmado",
      firmado_por: nombre,
      firmado_at: new Date().toISOString(),
      evidencia,
    })
    .eq("id", doc.id);
  if (error) return { ok: false, error: "No se pudo registrar la firma." };
  revalidatePath(`/firmar/${token}`);
  return { ok: true };
}
