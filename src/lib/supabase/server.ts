import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/*
  Cliente de Supabase para el servidor (Server Components, Route Handlers,
  Server Actions). Sincroniza la sesión del usuario vía cookies. En Next 16
  `cookies()` es asíncrono, por eso este helper es async.
*/
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: el middleware refresca la sesión.
          }
        },
      },
    },
  );
}
