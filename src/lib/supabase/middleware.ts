import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "./config";

/*
  Refresca la sesión de Supabase en cada request y protege las rutas: sin sesión,
  redirige a /login. Patrón oficial de @supabase/ssr para Next App Router.
  En local sin llaves (modo desarrollo) no hace nada: deja pasar.
*/
export async function actualizarSesion(request: NextRequest) {
  if (!supabaseConfigurado()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  // Rutas públicas (sin sesión de usuario). Cada una hace su propia autorización:
  // - /firmar/[token]: el cliente firma sin cuenta (el token es la llave).
  // - /api/webhook/*: Meta llama sin sesión (verify token + firma X-Hub-Signature).
  // - /api/cron/*: Vercel Cron llama sin sesión (Bearer CRON_SECRET).
  const esPublica =
    ruta.startsWith("/login") ||
    ruta.startsWith("/auth") ||
    ruta.startsWith("/firmar") ||
    ruta.startsWith("/api/webhook") ||
    ruta.startsWith("/api/cron");

  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
