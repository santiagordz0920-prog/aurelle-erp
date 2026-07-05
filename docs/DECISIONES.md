# DECISIONES — log técnico (append-only)

> Una línea por decisión: `fecha | decisión | por qué`. Nunca borrar; si una decisión se revierte, agregar línea nueva que la revierta. Buscar aquí ANTES de re-decidir cualquier cosa.

2026-07-05 | Stack: Next.js App Router + Supabase + Vercel | Decidido por Santiago en el Plan Maestro
2026-07-05 | WhatsApp vía Business Cloud API oficial, nunca bridges no oficiales | Riesgo de bloqueo del número
2026-07-05 | Tipografía de interfaz: Inter; fuentes de marca solo en PDFs generados server-side | Licencia de marca es desktop-only
2026-07-05 | CFDI/facturación fuera del ERP; campo folio_factura en ingresos | Lo maneja el contador externo
2026-07-05 | Esquema con sucursal_id desde día 1 | Expansión futura sin reconstrucción
2026-07-05 | Permisos vía RLS en base de datos, no solo en UI | Finanzas/márgenes solo-admin garantizado
2026-07-05 | ESTADO.md se sobreescribe; DECISIONES.md es append-only | Mantener costo de lectura por sesión mínimo
