import { createBrowserClient } from "@supabase/ssr";

/*
  Cliente de Supabase para componentes del navegador ("use client").
  Lee las llaves públicas del entorno. La seguridad real la da RLS en la base:
  la anon key solo puede lo que las policies permiten para el usuario logueado.
*/
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
