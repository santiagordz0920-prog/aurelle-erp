import "server-only";
import { createClient } from "@supabase/supabase-js";

/*
  Cliente con SERVICE ROLE — SOLO para procesos server-side sin sesión de usuario
  (crons, webhooks). Salta RLS, así que NUNCA se expone al navegador ni se usa en
  flujos con datos del usuario: úsalo solo en rutas protegidas por secreto.
*/
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
