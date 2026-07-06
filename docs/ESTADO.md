# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-06 (Claude Code).

## Fase actual
**Fase 2 — Dinero: EN CURSO.** Fase 1 completa y verificada en producción.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Fase 1 completa** — Clientes (0004), Inventario+costos solo-admin (0005/0006), Cotizador+margen solo-admin (0007), Pedidos: candado anticipo 2 + pagos + reserva + costo/margen real + conversión (0008), Tareas+Dashboard "Hoy" (0009). Cada uno con su `docs/modulos/*.md`.
- **Fase 2 en curso** — Finanzas v1 (0010/0011): ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. Proveedores v1 (0012): directorio en `/dinero/proveedores`. **Gastos recurrentes (0013):** alta + posteo mensual idempotente (función SECURITY DEFINER) + Vercel Cron protegido + botón manual; burn fijo en `/dinero/gastos`. Tercer evento §4 automático. `docs/modulos/finanzas.md`, `docs/modulos/gastos-recurrentes.md`.
- **Producción verificada:** las 19 tablas y el esquema de `tarea` (`entidad_tipo`/`estado`) confirmados en el Supabase de Santiago; migraciones 0004–0012 aplicadas. La bifurcación de dos ramas paralelas (2026-07-06) quedó reconciliada; el tronco oficial es `claude/business-erp-plan-kqb9uk`.
- **Guardarraíl anti-bifurcación:** hook `SessionStart` (`.claude/`) que al iniciar cada sesión instala deps, imprime ESTADO y lista ramas paralelas. Protocolo de `CLAUDE.md` reforzado (paso 0 = detectar bifurcación). Lint en cero, build verde.

## Siguiente tarea exacta
Continuar Fase 2 (§3.9–3.11, §3.17, Fase 2 en §6). Gastos recurrentes ya está. Pendientes, a elegir:
- **Compras a proveedor** (§3.10): registrar compra → alta de items en Inventario **o** gasto, + CxP a proveedor (la columna `cuenta_por_pagar.proveedor_id` ya existe). Cierra el ciclo Proveedores↔Inventario↔Finanzas + histórico de precios por proveedor.
- **Proyección de flujo 30/60/90** (§3.9): parcialidades por cobrar + pipeline ponderado − gastos conocidos (el burn fijo ya lo da Gastos recurrentes).
- **Comisiones** (§3.9/§3.17): devengadas al cierre del pedido (planner/referidor), % sobre utilidad real. Devengado depende de "pedido entregado" (ya sella margen).
- **Reporte al socio** (PDF mensual, §3.9) — reusar el patrón de cotización imprimible.
Seguir el patrón: migración → probar en Postgres local → dominio → datos+muestra → acciones → páginas → docs. Costos/finanzas SIEMPRE en tabla solo-admin.

## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011), gasto recurrente→asiento mensual (0013). Pendientes (fases posteriores): consumo de material en producción y contrato al confirmar (Fase 4); Postventa/Comisiones/lifecycle al entregar (Fases 4/6); tareas sugeridas por IA + Dashboard por rol + push.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra; producción se confirma con Santiago vía queries.
- Santiago debe estar dado de alta como admin en Supabase Auth para entrar a la app (rama `supabase-admin-emails` dejó un script; confirmar que ya puede entrar).
- **Pendiente aplicar en prod:** `0013_gastos_recurrentes.sql` + definir `CRON_SECRET` en Vercel (si no, el posteo mensual no corre; el botón manual sí). Ver `docs/modulos/gastos-recurrentes.md`.

## Notas para la siguiente sesión
- **El hook `SessionStart` ya te muestra el estado y las ramas al arrancar. Léelo.** Si hay una rama `claude/*` más nueva que la tuya, reconcilia antes de codear.
- Postgres local para probar SQL: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (roles authenticated/anon/service_role, `auth.users`, `auth.uid()`) + aplicar `supabase/migrations/00*.sql` en orden con `ON_ERROR_STOP=1`. No hacer pipe de `pgboot.sh` a `grep` o se pierde `$PSQL`.
- Capturas: `npm run build && npm run start` (sin llaves = datos de muestra) + Playwright `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (`item_costo`, `cotizacion_margen`, `pedido_costo`, `movimiento_financiero`, `proveedor`), nunca columna en la tabla principal — RLS es por fila, no por columna.
- Al crear formularios reusados en tarjetas angostas: `flex-wrap`, no `sm:flex-row` (breakpoints Tailwind son por viewport, no por contenedor).
