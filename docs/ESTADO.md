# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-06 (Claude Code).

## Fase actual
**Fase 3 — Riel de WhatsApp: ARRANCADA.** Fase 1 y núcleo de Fase 2 completos y en prod. Se está construyendo primero lo que NO depende de Meta. **Citas (0017) ya está** (agenda + resultado=funnel, usable a mano). **Envío asistido de WhatsApp ya está** (plantillas + wa.me, humano envía; sin migración). Sigue: inbox shell. El riel vivo (webhook/envío/bot) espera el trámite de Meta de Santiago.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Fase 1 completa** — Clientes (0004), Inventario+costos solo-admin (0005/0006), Cotizador+margen solo-admin (0007), Pedidos: candado anticipo 2 + pagos + reserva + costo/margen real + conversión (0008), Tareas+Dashboard "Hoy" (0009). Cada uno con su `docs/modulos/*.md`.
- **Fase 2 en curso** — Finanzas v1 (0010/0011): ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. Proveedores v1 (0012): directorio en `/dinero/proveedores`. **Gastos recurrentes (0013):** alta + posteo mensual idempotente (función SECURITY DEFINER) + Vercel Cron protegido + botón manual; burn fijo en `/dinero/gastos`. Tercer evento §4 automático. **Compras a proveedor v1 (0014):** registrar compra en `/dinero/compras` → asiento (costo/gasto) + CxP a crédito (4º evento §4). **Proyección de flujo 30/60/90** en `/dinero`. **Comisiones v1 (0015):** `/dinero/comisiones`, % sobre utilidad real. **Reporte al socio:** `/imprimir/reporte-socio`. **Alta de items desde la compra (0016):** una compra de inventario da de alta la pieza + su costo, ligada a la compra. `docs/modulos/finanzas.md`, `docs/modulos/gastos-recurrentes.md`, `docs/modulos/compras.md`, `docs/modulos/comisiones.md`.
- **Producción verificada:** las 19 tablas y el esquema de `tarea` (`entidad_tipo`/`estado`) confirmados en el Supabase de Santiago; migraciones 0004–0015 aplicadas. La bifurcación de dos ramas paralelas (2026-07-06) quedó reconciliada; el tronco oficial es `claude/business-erp-plan-kqb9uk`.
- **Fase 3 en curso** — **Citas (0017):** calendario del showroom (salas, tipos, candado anti doble-reserva, resultado obligatorio = funnel) en `/clientes/citas`, pestaña Citas en la ficha y "citas de hoy" en el Dashboard. Usable a mano ya; el bot reservará aquí cuando el riel esté vivo. **Envío asistido:** pestaña Conversación de la ficha → plantillas en tono Aurelle + botón que abre WhatsApp con el texto listo (humano envía, sin bridges). `docs/modulos/citas.md`, `docs/modulos/mensajeria.md`.
- **Guardarraíl anti-bifurcación:** hook `SessionStart` (`.claude/`) que al iniciar cada sesión instala deps, imprime ESTADO y lista ramas paralelas. Protocolo de `CLAUDE.md` reforzado (paso 0 = detectar bifurcación). Lint en cero, build verde.

## Siguiente tarea exacta
Seguir Fase 3 con lo construible sin Meta:
1. **Inbox shell** — modelo `conversacion`/`mensaje` (migración 0018) + pantalla de inbox con datos de muestra, ligado a cliente por teléfono. Se conecta al webhook de Meta después. Deja la estructura lista para que el riel vivo solo escriba mensajes entrantes/salientes.
2. Reusar el compositor de envío asistido en Pedidos (recordatorio de pago) y Citas (confirmación).
Luego, cuando Santiago tenga verificación de Meta + WABA: webhook (Meta→ERP), envío por Cloud API, bot v2 (calificación + reserva en Citas), plantillas aprobadas.
**Tarea de Santiago (ruta crítica, arrancar ya):** verificación de Meta Business + crear WABA; migrar el número ACTUAL (seguro: probar en número temporal, migrar al final); pasar las 4-5 preguntas de calificación del bot; redactar/aprobar plantillas (Claude las redacta).
Patrón: migración → Postgres local → dominio → datos+muestra → acciones → páginas → docs.

## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011), gasto recurrente→asiento mensual (0013). Pendientes (fases posteriores): consumo de material en producción y contrato al confirmar (Fase 4); Postventa/Comisiones/lifecycle al entregar (Fases 4/6); tareas sugeridas por IA + Dashboard por rol + push.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra; producción se confirma con Santiago vía queries.
- Santiago debe estar dado de alta como admin en Supabase Auth para entrar a la app (confirmar que ya puede entrar).
- **Migraciones en prod: 0004–0015 aplicadas** + `CRON_SECRET`. **Pendientes de aplicar: `0016_item_desde_compra.sql` y `0017_citas.sql`** (en ese orden). Sin 0017, el módulo Citas no tiene tabla en prod.

## Notas para la siguiente sesión
- **El hook `SessionStart` ya te muestra el estado y las ramas al arrancar. Léelo.** Si hay una rama `claude/*` más nueva que la tuya, reconcilia antes de codear.
- Postgres local para probar SQL: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (roles authenticated/anon/service_role, `auth.users`, `auth.uid()`) + aplicar `supabase/migrations/00*.sql` en orden con `ON_ERROR_STOP=1`. No hacer pipe de `pgboot.sh` a `grep` o se pierde `$PSQL`.
- Capturas: `npm run build && npm run start` (sin llaves = datos de muestra) + Playwright `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (`item_costo`, `cotizacion_margen`, `pedido_costo`, `movimiento_financiero`, `proveedor`), nunca columna en la tabla principal — RLS es por fila, no por columna.
- Al crear formularios reusados en tarjetas angostas: `flex-wrap`, no `sm:flex-row` (breakpoints Tailwind son por viewport, no por contenedor).
