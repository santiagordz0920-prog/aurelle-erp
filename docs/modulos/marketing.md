# Módulo: Marketing / Crecimiento (Fase 6 — v1 adelantada)

> El funnel con dinero real (§3.13): de lead por fuente a cierre, con CAC.
> Adelantado de Fase 6 porque encaja con el arranque de ads y corre sobre datos
> que ya existen. **Solo-admin** (el gasto es dinero).

## Estado
Construido 2026-07-09. Migración **0029** (`gasto_publicitario`). v1: funnel por
`fuente_canal` + captura manual de gasto + CAC. Build/lint verdes + smoke.

## Qué hace
- **Embudo por fuente** (ads/expo/referido/orgánico): leads → con cita → visitaron
  → cotizaron → cerraron, medido **por cliente** (cada lead progresa). Muestra la
  tasa **inquiry→visita** con la meta §3.13 (>5% = verde) e ingreso de cerrados.
- **Gasto de publicidad**: captura manual por mes y canal (`gasto_publicitario`);
  la sincronización con la Meta Marketing API llega después.
- **CAC** por canal = gasto ÷ cierres (y total). En `/crecimiento` (ya era el
  cascarón solo-admin del área Crecimiento).

## Piezas
- `supabase/migrations/0029_gasto_publicitario.sql`: tabla solo-admin (RLS
  `es_admin()`), `periodo` (1er día del mes), `canal`, `detalle` (campaña/zona),
  `monto`. Auditoría.
- `src/lib/data/marketing.ts`: `funnelPorFuente(periodo?)` (agrega por cliente
  sobre cliente/cita/cotizacion/pedido/gasto; solo-admin, `[]` si no admin) +
  `tasa()`. `src/lib/data/marketing-muestra.ts`: gasto de muestra.
- `src/app/(app)/crecimiento/actions.ts`: `registrarGasto` (zod, solo-admin).
- `src/app/(app)/crecimiento/page.tsx`: tabla del embudo + form de gasto.
  `src/components/marketing/gasto-form.tsx`.

## Definición del funnel (por cliente, por `fuente_canal`)
- **leads** = clientes con esa fuente.
- **con cita** = clientes con ≥1 cita.
- **visitaron** = clientes con ≥1 cita cuyo resultado ∈ {asistio, cotizo, cerro}.
- **cotizaron** = clientes con ≥1 `cotizacion` **o** `estado_pipeline` ∈ {cotizado, cerrado}.
- **cerraron** = clientes con `estado_pipeline='cerrado'`; **ingreso** = Σ total de
  sus pedidos (excluye cancelados).

## Lógica no obvia / trampas
- El embudo se mide **por cliente**, no por evento: casa con el KPI "inquiry→visita
  por lead" del plan. Un cliente sin `fuente_canal` no entra en ninguna fila.
- Gasto = dinero → **solo-admin** (RLS), igual que Finanzas. `funnelPorFuente`
  devuelve `[]` si el usuario no es admin.
- `pesos()` se reusa de `src/lib/inventario.ts` (cliente-safe).

## Pendientes / v3
- ~~Desglose por campaña/zona + CAC por campaña~~ **HECHO v2** (`funnelPorCampana`, casa `gasto.detalle`↔`cliente.fuente_detalle`; campañas con gasto pero sin leads también se listan; texto de campaña debe coincidir).
- Filtro por **periodo/mes** en la UI (la data ya acepta `periodo`).
- Costo por visita y por cotización; ticket promedio por canal.
- **Sincronización con Meta Marketing API** (hoy carga manual) + atribución
  automática por el parámetro del `wa.me` de cada campaña (llega con el riel).
- Alerta si inquiry→visita cae bajo el umbral N días seguidos (§3.13).
- ROI por expo (módulo Expos, §3.14).
