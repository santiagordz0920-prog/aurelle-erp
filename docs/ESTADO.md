# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de Fase 1 (Claude Code).

## Fase actual
Fase 1 — Núcleo comercial. Hecho: auth, Clientes, Inventario, Cotizador, **Pedidos (UI completa)**. **Pendiente para cerrar Fase 1: Tareas v1 y Dashboard v1.**

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Provisionado por Santiago: Supabase + Vercel arriba.
- **Auth real** + Clientes v1 (migración 0004). Ver `docs/modulos/clientes.md`.
- **Inventario** (0005; fix auditoría genérica 0006): items + item_costo (solo-admin) + consignante. `docs/modulos/inventario.md`.
- **Cotizador** (0007): precio_metal, cotizacion + líneas + margen (solo-admin), cotización de marca imprimible. `docs/modulos/cotizador.md`.
- **Pedidos** (0008 + dominio + **UI completa esta sesión**): lista con semáforo/saldo, detalle con plan de pagos (registrar pago 3 toques), candado de anticipo 2 + override admin auditado, reserva/liberación de inventario, costo/margen real solo-admin, entregar (sella margen). Conversión cotización→pedido desde `/ventas/cotizaciones/[id]` (estado='aceptada'). Build + lint OK; probado con datos de muestra (candado liberado/bloqueado, saldo, margen sellado). Ver `docs/modulos/pedidos.md`.

## Siguiente tarea exacta (retomar aquí)
Cerrar Fase 1 con **Tareas v1** (§3.15) y **Dashboard v1** (§3.16). Leer §3.15 y §3.16 del PLAN_MAESTRO.
Seguir el patrón ya establecido (data server-only + muestra + Server Actions con zod + páginas en su área):
1. **Tareas v1**: migración (tabla `tarea`: título, detalle, responsable, estado, prioridad, fecha, vínculo opcional a entidad — pedido/cliente), RLS por sucursal, `src/lib/tareas.ts` (constantes), capa de datos + acciones + páginas en el área correspondiente (§5). Tareas manuales + vinculadas.
2. **Dashboard v1** (`/hoy`): tarjetas de un vistazo — pedidos por estado/semáforo, saldos por cobrar, cotizaciones abiertas, tareas del día. Solo lectura, agregando desde las capas de datos existentes.

## Reacciones de la matriz §4 pendientes (registradas, NO implementadas)
De Pedidos, por dependencia de fase (ver comentarios TODO en `src/app/(app)/ventas/pedidos/actions.ts`):
- Al pagar → asiento en Finanzas (Fase 2).
- Al reservar/vender consignación → CxP a consignante (Fase 2).
- Al entrar a producción → item `reservado`→`consumido` (Fase 4, desde Producción).
- Al confirmar → contrato autogenerado (Documentos, Fase 4).
- Al entregar → Postventa (garantía+aniversarios), sellado financiero, Comisiones si hay referidor, lifecycle (Fases 4/6).

## Acción de Santiago (producción)
Aplicar en el SQL Editor de Supabase las migraciones **0004 a 0008** (en orden). Sin esto, los módulos nuevos (Clientes, Inventario, Cotizador, Pedidos) no tienen tablas en prod.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra. No bloquea.
- 3 errores de lint preexistentes (uso de `<a>` en cliente-form, cotizacion-builder, item-form) — fuera del alcance de esta tarea; no introducidos aquí.

## Notas para la siguiente sesión
- Sin llaves de Supabase, `npm install && npm run build && npm run start` levanta la app con datos de muestra (usuario admin de prueba). Rutas de Pedidos de muestra: `/ventas/pedidos/f2000000-0000-0000-0000-000000000001` (en producción, candado liberado), `…0002` (bloqueado), `…0003` (entregado, margen sellado).
- Patrón firme: costo/margen SIEMPRE en tabla aparte solo-admin (item_costo, cotizacion_margen, pedido_costo). Mostrar en UI solo si `usuario.rol==='admin'`.
- Componentes cliente interactivos van en `src/components/<modulo>/`; usan `useActionState`+`useFormStatus` (forms) o `useTransition` (acciones de un toque).
