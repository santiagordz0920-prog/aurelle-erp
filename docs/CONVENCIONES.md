# CONVENCIONES — cómo se escribe código en este repo

> Se llena durante Fase 0 conforme se establecen los patrones reales. Después de Fase 0 cambia rara vez. Todo agente DEBE seguir esto; si encuentras algo no definido y recurrente, defínelo aquí en la misma sesión.

## Idioma
- Interfaz, textos, notificaciones y mensajes de commit: español.
- Nombres de tablas y columnas: español, snake_case, singular (`cliente`, `pedido`, `item_inventario`).
- Código (variables, funciones, componentes): inglés estándar; nombres de dominio pueden ser en español si mapean a tablas (`getPedido`).

## Estructura de carpetas
- TBD en Fase 0 (definir: app routes por área de navegación — hoy/, clientes/, ventas/, taller/, dinero/, crecimiento/, sistema/).

## Base de datos
- Toda tabla de negocio: `id` uuid, `created_at`, `updated_at`, `sucursal_id` donde aplica.
- Migraciones vía Supabase CLI versionadas en el repo. Nunca cambios manuales directos en producción.
- RLS: TBD Fase 0 — definir el patrón exacto de policies por rol y copiarlo aquí como plantilla.
- Auditoría: TBD Fase 0 — definir trigger/tabla de auditoría estándar.

## Eventos entre módulos
- Patrón: TBD Fase 1 — definir cómo se implementan los eventos de la matriz (sección 4 del plan): funciones de base de datos + triggers vs. lógica en servidor. Documentar el patrón elegido aquí con un ejemplo completo.

## Componentes UI
- shadcn/ui como base; componentes propios en `components/` reutilizables antes de duplicar.
- Paleta: crema #F5F2EB fondo, verde bosque #08221B primario, dorado #B77321 acento escaso. Tokens en Tailwind config, nunca hex sueltos en componentes.
- Mobile-first: todo componente se diseña primero para pantalla de teléfono.

## Calidad
- TypeScript estricto.
- Validación de formularios: TBD Fase 0 (zod recomendado).
- Antes de marcar tarea como hecha: probar el flujo completo en móvil y escritorio.
