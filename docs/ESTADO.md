# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-06 tras reconciliar dos ramas bifurcadas (Claude Code).

## Nota de reconciliación (leer antes de nada)
Dos sesiones trabajaron en paralelo desde el mismo punto del repo sin coordinarse
y bifurcaron. Se adoptó la rama más completa (con Finanzas + Proveedores) como
tronco oficial de `claude/business-erp-plan-kqb9uk`. El esquema de Pedidos
resultó idéntico entre ambas; el único conflicto de esquema fue `tarea` (dos
diseños distintos — este documento y el código reflejan el que quedó vigente:
`entidad_tipo`/`estado` enum, no `vinculo_tipo`/`completada` booleano). Detalle
en `docs/DECISIONES.md` (2026-07-06). **Estamos verificando con Santiago qué
quedó realmente aplicado en su Supabase** antes de indicar el siguiente SQL a
correr — no asumir, confirmar con `select table_name from information_schema.tables
where table_schema='public'` primero.

## Fase actual
**Fase 2 — Dinero: EN CURSO.** Fase 1 completa. Finanzas v1: ledger solo-admin + asiento automático al pagar + captura manual + P&L del mes + capital de trabajo + **CxP a consignante** (migración 0011). Dos eventos de la matriz §4 implementados (pago→ingreso, consignación→CxP). **Proveedores v1** (0012): directorio en /dinero/proveedores.

## Acción de Santiago (producción) — EN VERIFICACIÓN
1. Correr el query de verificación (arriba) y confirmar qué tablas existen.
2. Si falta `proveedor` o la columna `cuenta_por_pagar.proveedor_id`: correr `0012_proveedores.sql` (hay una versión idempotente seguro-de-repetir, pedirla si no la tienes a la mano).
3. Si algo del bloque de `tarea` quedó a medias o con el esquema viejo (columnas `vinculo_tipo`/`completada` en vez de `entidad_tipo`/`estado`): avisar en la próxima sesión antes de seguir — puede necesitar un `DROP TABLE tarea CASCADE` + reaplicar 0009 limpio (es tabla nueva de hoy, sin datos reales que perder).

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Clientes v1** (0004) — `docs/modulos/clientes.md`.
- **Inventario** (0005/0006) — items + item_costo (solo-admin) + consignante. `docs/modulos/inventario.md`.
- **Cotizador** (0007) — precio_metal, cotización + líneas + margen (solo-admin), cotización imprimible. `docs/modulos/cotizador.md`.
- **Pedidos** (0008) — lista/detalle, plan de pagos, candado anticipo 2 + override auditado, reserva de inventario, costo/margen real solo-admin, entregar (sella margen), conversión desde cotización. `docs/modulos/pedidos.md`.
- **Tareas v1 + Dashboard "Hoy"** (0009) — tareas manuales + vinculadas a entidad; `/hoy` con KPIs reales, tareas del día y alertas. `docs/modulos/tareas.md`.
- **Finanzas v1** (0010/0011) — ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. `docs/modulos/finanzas.md`.
- **Proveedores v1** (0012) — directorio en `/dinero/proveedores`.
- Build limpio en el tronco reconciliado (`npm install && npm run build` verificado tras el reset).

## Siguiente tarea exacta
1. **Cerrar la verificación de producción** (ver arriba) antes de escribir código nuevo.
2. Continuar Fase 2, a elegir con Santiago: **compras de proveedor** (registrar compra → alta de inventario o gasto + CxP a proveedor, ya existe `cuenta_por_pagar.proveedor_id`); **gastos recurrentes** (§3.11, postean solos); **proyección de flujo 30/60/90** (§3.9). Costos de producción y comisiones dependen de Fases 4/6.

## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011). Pendientes: consumo de material en producción (Fase 4), contrato al confirmar (Fase 4), Postventa/Comisiones/lifecycle al entregar (Fases 4/6). Tareas sugeridas por IA + Dashboard por rol + push (fases posteriores).

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra; producción se confirma con Santiago.
- Estado exacto de Supabase en producción **por confirmar** (ver nota de reconciliación arriba) — no dar por hecho qué migraciones quedaron aplicadas hasta ver el resultado del query de verificación.
- 3 errores de lint preexistentes (uso de `<a>` en cliente-form, cotizacion-builder, item-form) — fuera de alcance.

## Notas para la siguiente sesión
- **Antes de tocar código de Fase 2**, confirmar con Santiago el resultado de la verificación de Supabase (nota arriba). Si el estado real difiere de lo que este documento asume, corregir aquí primero.
- Si se abre otra sesión en paralelo sobre este repo: coordinarse explícitamente sobre qué módulo toca cada una (regla de higiene de `CLAUDE.md` §8: un solo frente de trabajo por módulo). La bifurcación de 2026-07-06 fue exactamente por no hacer esto.
- Postgres local para probar SQL: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (roles authenticated/anon/service_role, auth.users, auth.uid()) + aplicar `supabase/migrations/00*.sql` en orden con `ON_ERROR_STOP=1`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (`item_costo`, `cotizacion_margen`, `pedido_costo`, `movimiento_financiero`, `proveedor`), nunca columna en la tabla principal — RLS es por fila, no por columna.
