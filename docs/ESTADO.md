# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-08 (Claude Code).

## Fase actual
**Fase 4 — Producción y Documentos: CERRADA en lo construible sin Meta.** Producción (kanban+costos+QC editable+atasco automático), Documentos (contrato/recibo, e-firma, snapshot congelado, cláusulas editables) y Biblioteca de media, todo hecho y verificado. Fase 1 y núcleo de Fase 2 completos y en prod. El cron nocturno de seguimiento (0025) cierra los últimos avisos automáticos. **Lo que queda de Fase 3/4 depende del riel vivo de WhatsApp** (webhook + Cloud API + bot), que espera el trámite de Meta de Santiago. Ya está hecho todo lo construible sin Meta: Citas (0017), envío asistido (wa.me), Inbox shell (0018). Fase 5 (IA) espera datos fluyendo por el riel.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Fase 1 completa** — Clientes (0004), Inventario+costos solo-admin (0005/0006), Cotizador+margen solo-admin (0007), Pedidos: candado anticipo 2 + pagos + reserva + costo/margen real + conversión (0008), Tareas+Dashboard "Hoy" (0009). Cada uno con su `docs/modulos/*.md`.
- **Fase 2 en curso** — Finanzas v1 (0010/0011): ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. Proveedores v1 (0012): directorio en `/dinero/proveedores`. **Gastos recurrentes (0013):** alta + posteo mensual idempotente (función SECURITY DEFINER) + Vercel Cron protegido + botón manual; burn fijo en `/dinero/gastos`. Tercer evento §4 automático. **Compras a proveedor v1 (0014):** registrar compra en `/dinero/compras` → asiento (costo/gasto) + CxP a crédito (4º evento §4). **Proyección de flujo 30/60/90** en `/dinero`. **Comisiones v1 (0015):** `/dinero/comisiones`, % sobre utilidad real. **Reporte al socio:** `/imprimir/reporte-socio`. **Alta de items desde la compra (0016):** una compra de inventario da de alta la pieza + su costo, ligada a la compra. `docs/modulos/finanzas.md`, `docs/modulos/gastos-recurrentes.md`, `docs/modulos/compras.md`, `docs/modulos/comisiones.md`.
- **Producción verificada:** las 19 tablas y el esquema de `tarea` (`entidad_tipo`/`estado`) confirmados en el Supabase de Santiago; migraciones 0004–0015 aplicadas. La bifurcación de dos ramas paralelas (2026-07-06) quedó reconciliada; el tronco oficial es `claude/business-erp-plan-kqb9uk`.
- **Fase 3 en curso** — **Citas (0017):** calendario del showroom (salas, tipos, candado anti doble-reserva, resultado obligatorio = funnel) en `/clientes/citas`, pestaña Citas en la ficha y "citas de hoy" en el Dashboard. Usable a mano ya; el bot reservará aquí cuando el riel esté vivo. **Envío asistido:** pestaña Conversación de la ficha → plantillas en tono Aurelle + botón que abre WhatsApp con el texto listo (humano envía, sin bridges). **Inbox shell (0018):** `/clientes/inbox` (lista + hilo con respuesta asistida), estructura conversacion/mensaje lista para el webhook. `docs/modulos/citas.md`, `docs/modulos/mensajeria.md`, `docs/modulos/inbox.md`.
- **Fase 3 (sin Meta) hecho** — **Citas (0017)**, **envío asistido** (`BotonWhatsApp` en Pedido/Cita, wa.me), **Inbox shell (0018)**, **Fechas importantes** (`/clientes/fechas` + tarjeta en `/hoy`). `docs/modulos/{citas,mensajeria,inbox}.md`.
- **Fase 4 — Producción** (0019, v2 responsable+QC, **v3 checklist QC editable 0023** en `/taller/produccion/qc`): kanban, avanzar en 2 toques, QC con candado, **costos→`costo_real` del pedido** (trigger). `docs/modulos/produccion.md`.
- **Fase 4 — Documentos** (0020 e-firma pública `/firmar/[token]`, **v3 snapshot congelado 0022**, **v4 cláusulas editables 0024** en `/sistema/contrato`): contrato/recibo imprimibles, contrato automático al confirmar, ficha 360 (tabs Documentos/Media), firma en canvas. Al firmar se congela `documento.contenido` (ContratoDatos + cláusulas) → un contrato firmado no cambia aunque cambie el pedido; `<ContratoDoc>` cae al default si faltan. `docs/modulos/documentos.md`.
- **Fase 4 — Biblioteca de media (0021):** galería `/taller/biblioteca` + renders/fotos en el pedido (bucket privado `media`, URLs firmadas 1h, versionado); enganches: envío por WhatsApp asistido, foto por etapa desde Producción, render aprobado→orden a `aprobacion_cliente`. `docs/modulos/biblioteca-media.md`.
- **Fase 4 — Cron nocturno de seguimiento (0025):** `/api/cron/seguimiento` (Vercel Cron diario, `CRON_SECRET`) → función idempotente `generar_tareas_seguimiento`: tarea automática por atasco de producción ≥7d y por contrato sin firmar >48h. `docs/modulos/seguimiento-cron.md`.
- **Todas las features de Fase 4 validadas** en Postgres local (cadena 0001–0025) + build/lint verdes + smoke test. **Guardarraíl anti-bifurcación:** hook `SessionStart` imprime ESTADO y lista ramas al arrancar.

## Siguiente tarea exacta
**PRIMERO: aplicar en prod las migraciones pendientes** (Santiago corre el SQL en Supabase, cada una una sola vez):
- `0024_clausulas_contrato.sql` (tabla + semilla de cláusulas).
- `0025_tareas_seguimiento.sql` (función del cron de seguimiento).
Y en Vercel, el cron nuevo `/api/cron/seguimiento` ya está en `vercel.json` (se activa en el próximo deploy; usa el `CRON_SECRET` que ya existe).

Con esto **Fase 4 queda cerrada de lo construible sin Meta.** Lo que resta está bloqueado o es fase posterior:
1. **Fase 3 — riel vivo de WhatsApp** (webhook + envío por Cloud API + bot): espera el trámite de Meta de Santiago. Es lo que desbloquea el mayor valor pendiente.
2. **Biblioteca:** adjuntar binario en WhatsApp — parte del mismo riel de Meta.
3. **Fase 5 — IA** (tareas sugeridas, resúmenes): espera datos fluyendo por el riel.
Sugerencia para la próxima sesión: si Meta ya está listo, arrancar el webhook de WhatsApp (Fase 3); si no, pulir detalles de UI o esperar. Revisar `PLAN_MAESTRO.md` §3.13/§3.14 (WhatsApp) cuando toque.
Con esto Fase 4 queda casi cerrada; Fase 3 (riel vivo de WhatsApp) espera el trámite de Meta; la IA (Fase 5) espera datos fluyendo.
Patrón: migración → Postgres local → dominio → datos+muestra → acciones → páginas → docs.


## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011), gasto recurrente→asiento mensual (0013), compra→asiento+CxP+alta de item (0014/0016), costo_produccion→costo_real (0019), etapa de producción→estado del pedido (0019, `sincronizarPedido`), **render aprobado→orden a aprobacion_cliente (0021, en `alternarAprobado`)**, QC como candado a listo_entrega, **contrato automático al confirmar el pedido (Documentos v2, `crearContratoSiNoExiste`)**, firma→snapshot congelado del contrato (0022), **atasco de producción→tarea y contrato sin firmar→tarea (cron nocturno, 0025)**. Pendientes (fases posteriores): consumo de material en producción (Fase 4); resultado de cita→pipeline del cliente y no-show→lifecycle (comentado en `citas/actions.ts`); cotización enviada→tarea de seguimiento; QC completo→sugerir cita de entrega+notificación; stock bajo→notificación/tarea; Postventa/Comisiones/lifecycle al entregar (Fases 4/6); tareas sugeridas por IA + Dashboard por rol + push.

## Problemas conocidos / bloqueos
- **Sandbox inestable para `npm run start` (2026-07-08):** el servidor de prod local se puede caer (SIGTERM, exit 144) tras varios `build`+`start`. **La mitigación FUNCIONA:** `rm -rf .next && npm run build` una vez y un solo `npm run start`; así se corrió el smoke test de Documentos v2 el mismo día. Para Playwright: instalar `playwright-core` en el scratchpad (no en el repo) y usar `executablePath` `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra; producción se confirma con Santiago vía queries.
- Santiago debe estar dado de alta como admin en Supabase Auth para entrar a la app (confirmar que ya puede entrar).
- **Migraciones en prod: 0004–0023 aplicadas** + `CRON_SECRET` + bucket privado `media` (Santiago aplicó `aplicar_0019_a_0021.sql` el 2026-07-08; `0022` `documento.contenido` y `0023` `qc_checklist_item` ya en prod). Producción (+ checklist QC editable), Documentos/e-firma/snapshot y Biblioteca ya persisten en prod. La 0022 se dejó idempotente (`add column if not exists`). **PENDIENTES en prod: `0024_clausulas_contrato.sql` y `0025_tareas_seguimiento.sql`** (validadas local; ver Siguiente tarea).
- **Auditoría de calidad (2026-07-08, rama `code-review-progress`): sin hallazgos graves.** Lint 0, build verde, RLS en las 21 migraciones, service_role confinado a firma/cron. Menores por limpiar en la próxima sesión: (1) comentarios obsoletos "§4 pendientes (Fase 2)" en `ventas/pedidos/actions.ts` (~145/175) — esos eventos ya corren por triggers 0010/0011; (2) `alternarAprobado` confía en `pedidoId`/`tipo` que manda el cliente — leerlos de la fila `media`; (3) en `produccion.md` la línea "Pendiente: fotos por etapa" quedó obsoleta (ya está hecho); (4) no hay pruebas automatizadas (verificación = build + validación visual) — considerar smoke tests antes del riel de WhatsApp.

## Notas para la siguiente sesión
- **El hook `SessionStart` ya te muestra el estado y las ramas al arrancar. Léelo.** Si hay una rama `claude/*` más nueva que la tuya, reconcilia antes de codear.
- Postgres local para probar SQL: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (roles authenticated/anon/service_role, `auth.users`, `auth.uid()`) + aplicar `supabase/migrations/00*.sql` en orden con `ON_ERROR_STOP=1`. No hacer pipe de `pgboot.sh` a `grep` o se pierde `$PSQL`.
- Capturas: `npm run build && npm run start` (sin llaves = datos de muestra) + Playwright `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (`item_costo`, `cotizacion_margen`, `pedido_costo`, `movimiento_financiero`, `proveedor`), nunca columna en la tabla principal — RLS es por fila, no por columna.
- Al crear formularios reusados en tarjetas angostas: `flex-wrap`, no `sm:flex-row` (breakpoints Tailwind son por viewport, no por contenedor).
