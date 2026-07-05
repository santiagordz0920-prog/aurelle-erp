# Aurelle ERP

ERP interno de **Aurelle & Co.** (joyería premium de compromiso, Monterrey).
Reemplaza 4 Google Sheets con un solo sistema donde vive todo el negocio:
clientes, conversaciones, pedidos, inventario y dinero.

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres, Auth, Storage, RLS) · WhatsApp Business Cloud API · Anthropic API.
- **Interfaz:** 100% en español, mobile-first, PWA instalable.

## Para desarrolladores (y agentes de Claude Code)

La fuente de verdad del proyecto vive en la documentación. **Empieza por ahí:**

1. `CLAUDE.md` — constitución del repo y protocolo de sesión (obligatorio).
2. `docs/ESTADO.md` — dónde vamos y la siguiente tarea exacta.
3. `docs/PLAN_MAESTRO.md` — especificación completa del producto.
4. `docs/CONVENCIONES.md` — cómo se escribe código aquí.
5. `docs/DECISIONES.md` — log de decisiones técnicas.
6. `docs/modulos/*.md` — qué se construyó realmente por módulo.

## Correr en local

```bash
npm install
cp .env.example .env.local   # llenar con las llaves de Supabase
npm run dev                  # http://localhost:3000
```

Base de datos y migraciones: ver `supabase/README.md`.

## Estado

Fase 0 (Fundaciones) construida: cascarón de navegación, sistema de diseño,
y la base de seguridad (roles + RLS + auditoría, verificada sobre Postgres).
Pendiente: provisionar Supabase/Vercel y conectar el auth real. Ver `docs/ESTADO.md`.
