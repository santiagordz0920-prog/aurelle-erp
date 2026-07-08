"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { DOCUMENTOS_MUESTRA } from "@/lib/data/documentos-muestra";
import { PEDIDOS_MUESTRA, pagadoDe } from "@/lib/data/pedidos-muestra";
import { construirContratoDesdePedido } from "@/lib/data/documentos";

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
  // Trazo de firma (dataURL PNG), evidencia adicional. Se acota para no meter
  // basura enorme en jsonb; si viene raro, se ignora.
  const trazoRaw = (formData.get("firma_trazo") as string) || "";
  const firma_trazo =
    trazoRaw.startsWith("data:image/png;base64,") && trazoRaw.length < 200_000
      ? trazoRaw
      : null;
  const evidencia = {
    user_agent: h.get("user-agent") ?? null,
    firmado_desde: h.get("x-forwarded-for") ?? null,
    at: new Date().toISOString(),
    firma_trazo,
  };

  if (!supabaseConfigurado()) {
    const d = DOCUMENTOS_MUESTRA.find((x) => x.token === token);
    if (!d) return { ok: false, error: "Documento no encontrado." };
    if (d.estado === "firmado") return { ok: false, error: "Este documento ya fue firmado." };
    // Congela el snapshot del contrato al firmar (0022).
    const pm = PEDIDOS_MUESTRA.find((x) => x.id === d.pedido_id);
    d.contenido = pm
      ? {
          cliente_nombre: pm.cliente_nombre ?? null,
          linea_negocio: pm.linea_negocio,
          total: pm.total,
          pagos: (pm.pagos ?? []).map((pg) => ({
            id: pg.id,
            tipo: pg.tipo,
            fecha: pg.fecha,
            monto: pg.monto,
          })),
          saldo: pm.total - pagadoDe(pm),
          created_at: pm.created_at,
          fecha_compromiso: pm.fecha_compromiso,
        }
      : null;
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
    .select("id, estado, pedido_id, contenido")
    .eq("token", token)
    .maybeSingle();
  if (!doc) return { ok: false, error: "Documento no encontrado." };
  if (doc.estado === "firmado") return { ok: false, error: "Este documento ya fue firmado." };
  if (doc.estado === "cancelado") return { ok: false, error: "Este documento fue cancelado." };

  // Congela el snapshot del contrato al firmar (0022): lo que el cliente firma
  // queda inmutable, aunque el pedido cambie después.
  const contenido = doc.contenido ?? (await construirContratoDesdePedido(supabase, doc.pedido_id));

  const { error } = await supabase
    .from("documento")
    .update({
      estado: "firmado",
      firmado_por: nombre,
      firmado_at: new Date().toISOString(),
      evidencia,
      contenido,
    })
    .eq("id", doc.id);
  if (error) return { ok: false, error: "No se pudo registrar la firma." };
  revalidatePath(`/firmar/${token}`);
  return { ok: true };
}
