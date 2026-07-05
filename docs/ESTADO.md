# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de Fase 1 (Claude Code).

## Fase actual
**Fase 2 — Finanzas: EN CURSO.** Fase 1 completa. Finanzas v1: ledger solo-admin + asiento automático al pagar (primer evento de la matriz §4) + P&L del mes + capital de trabajo + **captura manual de movimientos**. Migraciones 0004–0010 aplicadas en prod (confirmado por Santiago). Siguiente: **CxP a consignante** al reservar/vender consignación (Inventario/Pedidos→Finanzas) — necesita tabla `cuenta_por_pagar` + trigger; luego costos de producción (dependen de Fase 4). Leer §3.9, §3.10 y matriz §4.

## Acción de Santiago (producción)
Migraciones al día (0004–0010 aplicadas). El próximo slice de CxP traerá una 0011 nueva.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Clientes v1** (0004) — `docs/modulos/clientes.md`.
- **Inventario** (0005/0006) — items + item_costo (solo-admin) + consignante. `docs/modulos/inventario.md`.
- **Cotizador** (0007) — precio_metal, cotización + líneas + margen (solo-admin), cotización imprimible. `docs/modulos/cotizador.md`.
- **Pedidos** (0008) — lista/detalle, plan de pagos, candado anticipo 2 + override auditado, reserva de inventario, costo/margen real solo-admin, entregar (sella margen), conversión desde cotización. `docs/modulos/pedidos.md`.
- **Tareas v1 + Dashboard "Hoy"** (0009) — tareas manuales + vinculadas a entidad (con alta en 2 toques desde la ficha de cliente); `/hoy` con KPIs reales (pipeline, por cobrar, entregas por vencer), tareas del día y alertas. `docs/modulos/tareas.md`.
- **Producción**: migraciones 0004–0009 aplicadas en Supabase (Santiago, 2026-07-05). Build + lint OK; probado con Postgres local + datos de muestra.

## Siguiente tarea exacta (arrancar Fase 2 — Finanzas)
Leer §3.7 (Finanzas) y la matriz §4 del PLAN_MAESTRO. Empezar cerrando las **reacciones de la matriz que ya tienen su origen construido**:
1. **Asiento en Finanzas al registrar un pago** (Pedidos→Finanzas): diseñar tabla de movimientos/ingresos, migración 0010, y disparar el asiento desde `registrarPago` (o trigger de BD — decidir y documentar en CONVENCIONES §"Eventos entre módulos", que sigue TBD).
2. **CxP a consignante al reservar/vender consignación** (Pedidos/Inventario→Finanzas).
3. Capital de trabajo atrapado por pedido (ya hay saldo/costo; falta el rollup financiero).
Todo Finanzas es **solo-admin** (regla dura). Revisar `docs/DECISIONES.md` antes de decidir el patrón de eventos.

## Reacciones de la matriz §4 pendientes (registradas)
Comentarios TODO en `src/app/(app)/ventas/pedidos/actions.ts`: asiento en Finanzas al pagar (Fase 2, siguiente), CxP consignación (Fase 2), consumo de material en producción (Fase 4), contrato al confirmar (Fase 4), Postventa/Comisiones/lifecycle al entregar (Fases 4/6). Tareas sugeridas por IA + Dashboard por rol + push (fases posteriores).

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza Supabase/Vercel (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra.
- 3 errores de lint preexistentes (uso de `<a>` en cliente-form, cotizacion-builder, item-form) — fuera de alcance; no introducidos en estas tareas.
- Falta que Santiago registre usuarios (Auth → Add user) y se promueva a admin para entrar a la app en prod (ver `supabase/README.md`, paso 6).

## Notas para la siguiente sesión
- Sin llaves, `npm install && npm run build && npm run start` levanta la app con datos de muestra (admin de prueba). Ojo: correr `npm run start` en background del harness (no en subshell que se reap-ea).
- Validación de SQL: hay Postgres 16 local; stub de `auth` (roles authenticated/anon/service_role, esquema auth, auth.users, auth.uid()) + aplicar `supabase/migrations/00*.sql` con `ON_ERROR_STOP=1`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (item_costo, cotizacion_margen, pedido_costo) y mostrar solo si `usuario.rol==='admin'`.
- Componentes cliente en `src/components/<modulo>/`; `useActionState`+`useFormStatus` (forms) o `useTransition` (acciones de un toque).
