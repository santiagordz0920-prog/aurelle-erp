# ERP Aurelle — CLAUDE.md

ERP interno de Aurelle & Co. (joyería premium de compromiso, Monterrey). Reemplaza 4 Google Sheets. Usuarios: Santiago (CEO) y Fer (COO). Stack: Next.js (App Router) en Vercel + Supabase (Postgres, Auth, Storage, RLS) + WhatsApp Business Cloud API + Anthropic API. Interfaz 100% en español. Santiago NO es técnico: explica siempre en términos simples y confirma antes de decisiones con costo o irreversibles.

## Protocolo de sesión (OBLIGATORIO)

**Al iniciar toda sesión:**
1. Lee `docs/ESTADO.md` completo (1 página). Ahí está la fase actual, la tarea siguiente exacta y qué secciones del plan leer.
2. Lee SOLO la sección del `docs/PLAN_MAESTRO.md` que ESTADO.md indica para la tarea en turno. Nunca leas el plan completo.
3. Si vas a tocar un módulo ya construido, lee su archivo en `docs/modulos/`.
4. Antes de proponer una decisión técnica, busca en `docs/DECISIONES.md` si ya se tomó (grep por palabra clave, no lectura completa).

**Al terminar toda sesión (o cada entrega significativa):**
1. Actualiza `docs/ESTADO.md`: mueve lo terminado a "Hecho", define la siguiente tarea exacta, registra problemas conocidos. SOBREESCRIBE — no acumules historia vieja; ESTADO.md nunca debe pasar de ~1 página.
2. Agrega una línea a `docs/DECISIONES.md` por cada decisión técnica tomada (formato: fecha | decisión | por qué, en una línea).
3. Si construiste o modificaste un módulo, crea/actualiza `docs/modulos/<modulo>.md` (usa `docs/modulos/_PLANTILLA.md`).
4. Si estableciste un patrón nuevo reutilizable, agrégalo a `docs/CONVENCIONES.md`.

Una sesión que no actualiza ESTADO.md le cuesta a la siguiente sesión re-descubrir todo. No hay excepciones.

## Reglas duras

- Sigue `docs/CONVENCIONES.md` al pie de la letra. Si algo no está definido ahí y es un patrón que se repetirá, defínelo, úsalo y documéntalo.
- Todo el esquema lleva `sucursal_id` donde aplica. RLS activo en toda tabla con datos sensibles; los permisos viven en la base de datos, no solo en la interfaz.
- Los datos de Finanzas, márgenes y reglas de precio son solo-admin SIEMPRE.
- La matriz de interconexiones (PLAN_MAESTRO.md sección 4) es contrato: si implementas un evento, implementa las reacciones listadas o registra explícitamente en ESTADO.md cuáles quedan pendientes.
- Nunca borres ni migres datos de producción sin plan de verificación y confirmación explícita de Santiago.
- Nunca subas secretos al repo (.env en .gitignore; secretos en Vercel/Supabase).
- No refactorices código fuera del alcance de la tarea en turno sin registrarlo como decisión.
- Commits pequeños y frecuentes con mensajes en español descriptivos.

## Mapa de documentos

| Archivo | Qué es | Cuándo leerlo |
|---|---|---|
| `docs/ESTADO.md` | Dónde vamos, tarea siguiente | SIEMPRE al inicio |
| `docs/PLAN_MAESTRO.md` | Especificación completa del producto | Solo la sección de la tarea |
| `docs/DECISIONES.md` | Log de decisiones técnicas | Buscar antes de decidir |
| `docs/CONVENCIONES.md` | Cómo se escribe código aquí | Al inicio de tu primera sesión; consulta puntual después |
| `docs/modulos/*.md` | Qué se construyó realmente por módulo | Al tocar ese módulo |
