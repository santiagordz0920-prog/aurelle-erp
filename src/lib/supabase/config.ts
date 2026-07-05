/**
 * ¿Están configuradas las llaves de Supabase? En producción (Vercel) sí, y todo
 * corre contra la base real con RLS. En local, sin llaves, la app usa datos de
 * muestra y un usuario admin de prueba para poder desarrollar y ver la interfaz.
 * Este flag es el único interruptor entre "modo nube" y "modo local".
 */
export function supabaseConfigurado(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
