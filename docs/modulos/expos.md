# Módulo: Expos (§3.14)

> Referencia rápida de lo que EXISTE. Actualizar en la misma sesión en que se modifique.

## Estado
Construido en Fase 6. Última modificación: 2026-07-11.

## Tablas
- `expo` (migración `0034_expos.sql`) — calendario de expos con `estado` (enum `estado_expo`: candidata / contratada / ejecutada / cancelada), `costo` numeric(12,2) (stand + viáticos + material), `ciudad`, `fecha_inicio`/`fecha_fin`, `contacto` (texto libre), `notas`, `sucursal_id`. RLS por sucursal (select y write = `es_admin() or sucursal_id = sucursal_actual()`). Triggers `updated_at` + `registrar_auditoria`.
  - **No hay tabla de leads propia.** Los leads capturados en el stand se guardan en `cliente` con `fuente_canal='expo'` y `fuente_detalle = <nombre de la expo>`. El ROI se calcula casando ese texto contra `expo.nombre` (mismo patrón que el funnel por campaña, 0029/v2).

## Rutas / pantallas
- `/crecimiento/expos` — **solo-admin** (`puedeVerAreaAdmin`). Alta de expo, lista de tarjetas con estado editable + eliminar, panel de ROI por evento (Costo / Leads / Visitas / Cierres / Ingreso / ROI% / CAC por cierre) y captura rápida de lead en el stand. Enlazada desde `/crecimiento` (botón "Expos y ROI").

## Eventos que emite / consume
- **Emite:** captura de lead en el stand → crea `cliente` (fuente_canal=expo, fuente_detalle=nombre) → alimenta el funnel de Marketing (`/crecimiento`) y el pipeline.
- **Consume:** `cita` (resultado in asistio/cotizo/cerro = "visitó") y `pedido` (total de clientes con `estado_pipeline='cerrado'`, excluye `estado='cancelado'`) para calcular visitas / cierres / ingreso.

## Lógica no obvia / trampas
- El ROI vive en la capa de datos (`src/lib/data/expos.ts`, `statsPorExpo` + `listarExpos`), NO en la BD. `listarExpos` devuelve `[]` si el usuario no es admin (doble candado con la RLS y con el gate de la página).
- El match lead↔expo y gasto↔expo es por **texto exacto** de `nombre`/`fuente_detalle` (con `trim`). Si el nombre de la expo cambia después de capturar leads, esos leads dejan de casar. No renombrar una expo con leads ya capturados.
- ROI% = (ingreso − costo) / costo; CAC por cierre = costo / cierres. Se pinta "—" cuando no hay costo (>0) o no hay cierres.
- "Visitó" reusa la misma definición de la cita que el funnel de Marketing (`asistio`/`cotizo`/`cerro`), para que los dos tableros cuenten igual.
- Cliente-safe vs server-only: dominio/constantes en `src/lib/expos.ts` (sin `server-only`, lo importan los componentes); fetching en `src/lib/data/expos.ts` (`server-only`). No importar la capa de datos desde un componente cliente.
- Modo local (sin Supabase): `EXPOS_MUESTRA` + `CLIENTES_MUESTRA` mutables en memoria; el ROI se calcula sobre `CITAS_MUESTRA`/`PEDIDOS_MUESTRA`.

## Pendientes conocidos de este módulo
- Sin edición de expo (solo alta / cambio de estado / borrado). Editar nombre/costo = re-crear por ahora.
- El costo es un solo número; desglose (stand vs viáticos vs material) queda para después si se necesita.
- Sincronización de gasto de expo con Finanzas: hoy el costo vive solo en `expo` (no genera asiento en el ledger). Registrarlo como gasto real es mejora posterior.

## Captura de lead con contacto multicanal (2026-07-11, 0036)
El form del stand ahora pide teléfono, correo u "otro contacto" (mínimo UNO,
regla compartida del CRM); el teléfono se guarda sin espacios y
`contacto_preferido` queda en el primero capturado (teléfono→correo→otro).
