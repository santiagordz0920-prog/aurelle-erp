# DECISIONES — log técnico (append-only)

> Una línea por decisión: `fecha | decisión | por qué`. Nunca borrar; si una decisión se revierte, agregar línea nueva que la revierta. Buscar aquí ANTES de re-decidir cualquier cosa.

2026-07-05 | Stack: Next.js App Router + Supabase + Vercel | Decidido por Santiago en el Plan Maestro
2026-07-05 | WhatsApp vía Business Cloud API oficial, nunca bridges no oficiales | Riesgo de bloqueo del número
2026-07-05 | Tipografía de interfaz: Inter; fuentes de marca solo en PDFs generados server-side | Licencia de marca es desktop-only
2026-07-05 | CFDI/facturación fuera del ERP; campo folio_factura en ingresos | Lo maneja el contador externo
2026-07-05 | Esquema con sucursal_id desde día 1 | Expansión futura sin reconstrucción
2026-07-05 | Permisos vía RLS en base de datos, no solo en UI | Finanzas/márgenes solo-admin garantizado
2026-07-05 | ESTADO.md se sobreescribe; DECISIONES.md es append-only | Mantener costo de lectura por sesión mínimo
2026-07-05 | Next.js 16 + React 19 + Tailwind v4 (config CSS con @theme, sin tailwind.config.js) | Baseline de create-next-app; v4 usa tokens en CSS
2026-07-05 | shadcn/ui + cn() (clsx+tailwind-merge) + class-variance-authority + lucide-react | Sistema de componentes del plan (§5)
2026-07-05 | Rutas por área de navegación en grupo (app)/, no por tabla | Coincide con la navegación del §5 y con "trabajo real"
2026-07-05 | Roles como enum Postgres (admin/ventas/taller) + helpers SECURITY DEFINER es_admin/rol_actual/sucursal_actual | Base reusable de toda policy RLS sin recursión
2026-07-05 | Auditoría vía trigger genérico registrar_auditoria() adjunto por tabla; tabla auditoria append-only, SELECT solo-admin | Historial inmutable de quién/cuándo (§1)
2026-07-05 | Perfil de usuario se autocrea con trigger sobre auth.users; rol default 'ventas', admin se promueve a mano | Evita capturar dos veces; admin es decisión explícita
2026-07-05 | Ellion con id fijo 00000000-…-0001 como sucursal por defecto | Referenciable desde seeds y triggers
2026-07-05 | Auth en session.ts es stub (admin fijo) hasta provisionar Supabase | Permite construir y ver la UI sin nube; punto de integración documentado
2026-07-05 | zod para validación de formularios (Fase 1) | Recomendado en CONVENCIONES; estándar con TS
