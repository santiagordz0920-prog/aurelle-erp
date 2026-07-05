# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de Fase 1 (Claude Code).

## Fase actual
**Fase 2 — Finanzas: EN CURSO.** Fase 1 completa. Finanzas v1: ledger solo-admin + asiento automático al pagar + captura manual + P&L del mes + capital de trabajo + **CxP a consignante** (migración 0011: al reservar consignación nace la cuenta por pagar, marcable como pagada). Dos eventos de la matriz §4 implementados (pago→ingreso, consignación→CxP). **Proveedores v1** (0012): directorio en /dinero/proveedores (alta con categorías + condiciones). Siguiente: compras de proveedor (alta de inventario/gasto + CxP a proveedor, ya hay cuenta_por_pagar.proveedor_id), o métricas/P&L por línea (§3.9). Costos de producción dependen de Fase 4.

## Acción de Santiago (producción)
Aplicar en el SQL Editor **0012_proveedores.sql** (0004–0011 ya están).

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Clientes v1** (0004) — `docs/modulos/clientes.md`.
- **Inventario** (0005/0006) — items + item_costo (solo-admin) + consignante. `docs/modulos/inventario.md`.
- **Cotizador** (0007) — precio_metal, cotización + líneas + margen (solo-admin), cotización imprimible. `docs/modulos/cotizador.md`.
- **Pedidos** (0008) — lista/detalle, plan de pagos, candado anticipo 2 + override auditado, reserva de inventario, costo/margen real solo-admin, entregar (sella margen), conversión desde cotización. `docs/modulos/pedidos.md`.
- **Tareas v1 + Dashboard "Hoy"** (0009) — tareas manuales + vinculadas a entidad; `/hoy` con KPIs reales, tareas del día y alertas. `docs/modulos/tareas.md`.
- **Finanzas v1** (0010/0011) — ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. `docs/modulos/finanzas.md`.
- **Proveedores v1** (0012) — directorio en `/dinero/proveedores`. 
- **Producción**: migraciones 0004–0011 aplicadas en Supabase (Santiago); 0012 pendiente. Build + lint OK; probado con Postgres local + muestra.

## Siguiente tarea exacta
Continuar Fase 2. Opciones (elegir con Santiago): **compras de proveedor** (registrar compra → alta de inventario o gasto + CxP a proveedor, ya existe `cuenta_por_pagar.proveedor_id`); **métricas/P&L por línea** y proyección de flujo 30/60/90 (§3.9); **gastos recurrentes** (§3.11, postean solos). Costos de producción y comisiones dependen de Fases 4/6.

## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011). Pendientes (TODO en `pedidos/actions.ts`): consumo de material en producción (Fase 4), contrato al confirmar (Fase 4), Postventa/Comisiones/lifecycle al entregar (Fases 4/6). Tareas sugeridas por IA + Dashboard por rol + push (fases posteriores).

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza Supabase/Vercel (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra.
- 3 errores de lint preexistentes (uso de `<a>` en cliente-form, cotizacion-builder, item-form) — fuera de alcance; no introducidos en estas tareas.
- Falta que Santiago registre usuarios (Auth → Add user) y se promueva a admin para entrar a la app en prod (ver `supabase/README.md`, paso 6).

## Notas para la siguiente sesión
- Sin llaves, `npm install && npm run build && npm run start` levanta la app con datos de muestra (admin de prueba). Ojo: correr `npm run start` en background del harness (no en subshell que se reap-ea).
- Validación de SQL: hay Postgres 16 local; stub de `auth` (roles authenticated/anon/service_role, esquema auth, auth.users, auth.uid()) + aplicar `supabase/migrations/00*.sql` con `ON_ERROR_STOP=1`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (item_costo, cotizacion_margen, pedido_costo) y mostrar solo si `usuario.rol==='admin'`.
- Componentes cliente en `src/components/<modulo>/`; `useActionState`+`useFormStatus` (forms) o `useTransition` (acciones de un toque).
