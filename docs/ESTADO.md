# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-05 por sesión de Fase 1 (Claude Code).

## Fase actual
Fase 1 — Núcleo comercial. Hecho: auth, Clientes, Inventario, Cotizador. **En curso: Pedidos** (migración lista, falta UI). Pendiente después: Tareas v1, Dashboard v1.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Provisionado por Santiago: Supabase + Vercel arriba.
- **Auth real** + Clientes v1 (migración 0004). Ver `docs/modulos/clientes.md`.
- **Inventario** (0005; fix auditoría genérica 0006): items + item_costo (solo-admin) + consignante. `docs/modulos/inventario.md`.
- **Cotizador** (0007): precio_metal, cotizacion + líneas + margen (solo-admin), cotización de marca imprimible. `docs/modulos/cotizador.md`.
- **Pedidos — migración 0008 + dominio**: tablas pedido/pago/pedido_costo(solo-admin), enums, candado anticipo 2, semáforo. Probado en Postgres (saldo, candado, RLS, anti-suplantación). `src/lib/pedidos.ts` listo. **FALTA la UI (ver siguiente tarea).**

## En progreso
- **Pedidos UI** — es la tarea inmediata. Ya existe: migración 0008 (aplicar en prod), `src/lib/pedidos.ts` (dominio: estados, semáforo, `puedeComprarMateriales`).

## Siguiente tarea exacta (retomar Pedidos aquí)
Construir, siguiendo el patrón de Clientes/Cotizador (capa de datos server-only + muestra + Server Actions + páginas):
1. `src/lib/data/pedidos-muestra.ts` y `src/lib/data/pedidos.ts` (listar/get con pagos, `pagado`/`saldo` derivados, `costo_real` solo-admin).
2. `src/app/(app)/ventas/pedidos/actions.ts`: `crearPedidoDesdeCotizacion`, `registrarPago` (3 toques: monto/método/tipo), `reservarItem` (asigna item de inventario → `estado=reservado`, `pedido_id`), `cambiarEstado`, `overrideCandado` (admin, auditado), `setCostoReal` (admin), `entregarPedido` (sella margen).
3. Páginas: `/ventas/pedidos` (lista con semáforo + saldo) y `/ventas/pedidos/[id]` (plan de pagos + registrar pago + candado/override + items reservados + costo/margen real admin + entregar).
4. En `/ventas/cotizaciones/[id]`: botón **Convertir a pedido** cuando estado='aceptada' → llama `crearPedidoDesdeCotizacion` (copia cliente, total; guarda `cotizacion.pedido_id`).
5. Activar la tarjeta Pedidos del landing `/ventas` (ya enlaza a `/ventas/pedidos`).

**Reacciones de la matriz §4 a registrar como pendientes** (Finanzas=Fase 2, Producción/Documentos=Fase 4, Postventa/Comisiones=Fase 6): asiento en Finanzas al pagar; CxP a consignante al reservar/vender consignación; desbloqueo de producción con anticipo 2; contrato al confirmar; Postventa/lifecycle/comisión al entregar.

**Luego:** Tareas v1 (§3.15) y Dashboard v1 (§3.16) para cerrar Fase 1. Leer §3.4, §3.15, §3.16.

## Acción de Santiago (producción)
1. Aplicar en el SQL Editor de Supabase las migraciones **0004 a 0008** (archivo cumulativo que la sesión dejó, o los .sql en orden). Sin esto, los módulos nuevos no tienen tablas en prod.
2. Crear los usuarios admin en Authentication → Users → Add user (fgzz01@outlook.com y santiagordz0920@gmail.com, con Auto Confirm) y luego correr `supabase/scripts/promover_admins.sql` en el SQL Editor.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: Postgres local + capturas. No bloquea.
- Migraciones 0004–0008 pendientes de aplicar en prod (ver arriba).

## Notas para la siguiente sesión
- Harness de pruebas: `source /scratchpad/pgboot.sh` (o recrear: Postgres como usuario `postgres` desde `/var/tmp`, stub de `auth` + roles, aplica todas las migraciones, crea admin `a0000000-…-01` y ventas `b0000000-…-02`). Ojo: no piped con grep o se pierde `$PSQL`.
- Capturas: `npm run build && npm run start` sin llaves (datos de muestra) + Playwright `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Patrón: costo/margen SIEMPRE en tabla aparte solo-admin (item_costo, cotizacion_margen, pedido_costo). Mostrar en UI solo si `usuario.rol==='admin'`.
