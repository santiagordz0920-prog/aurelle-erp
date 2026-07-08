# ESTADO — ERP Aurelle

> Bastón de relevo entre sesiones. Se SOBREESCRIBE (no se acumula). Máx. ~1 página.
> Última actualización: 2026-07-08 (Claude Code).

## Fase actual
**Fase 4 — Producción y Documentos: EN CURSO** (Fase 3 topada por el trámite de Meta). Producción (kanban+costos) y Documentos v1 (contrato+recibo imprimibles) hechos. Fase 1 y núcleo de Fase 2 completos y en prod. Se está construyendo primero lo que NO depende de Meta. **Citas (0017) ya está** (agenda + resultado=funnel, usable a mano). **Envío asistido de WhatsApp ya está** (plantillas + wa.me, humano envía; sin migración). **Inbox shell (0018) ya está** (conversaciones/mensajes + pantalla, con muestra). **Con esto, TODO lo construible sin Meta de Fase 3 está hecho.** Falta el riel vivo (webhook + envío por Cloud API + bot), que espera el trámite de Meta de Santiago.

## Hecho
- **Fase 0** completa (app, diseño, navegación, roles+RLS+auditoría). Supabase + Vercel arriba.
- **Fase 1 completa** — Clientes (0004), Inventario+costos solo-admin (0005/0006), Cotizador+margen solo-admin (0007), Pedidos: candado anticipo 2 + pagos + reserva + costo/margen real + conversión (0008), Tareas+Dashboard "Hoy" (0009). Cada uno con su `docs/modulos/*.md`.
- **Fase 2 en curso** — Finanzas v1 (0010/0011): ledger solo-admin, asiento automático al pagar, CxP a consignante al reservar, captura manual, P&L del mes, capital de trabajo. Proveedores v1 (0012): directorio en `/dinero/proveedores`. **Gastos recurrentes (0013):** alta + posteo mensual idempotente (función SECURITY DEFINER) + Vercel Cron protegido + botón manual; burn fijo en `/dinero/gastos`. Tercer evento §4 automático. **Compras a proveedor v1 (0014):** registrar compra en `/dinero/compras` → asiento (costo/gasto) + CxP a crédito (4º evento §4). **Proyección de flujo 30/60/90** en `/dinero`. **Comisiones v1 (0015):** `/dinero/comisiones`, % sobre utilidad real. **Reporte al socio:** `/imprimir/reporte-socio`. **Alta de items desde la compra (0016):** una compra de inventario da de alta la pieza + su costo, ligada a la compra. `docs/modulos/finanzas.md`, `docs/modulos/gastos-recurrentes.md`, `docs/modulos/compras.md`, `docs/modulos/comisiones.md`.
- **Producción verificada:** las 19 tablas y el esquema de `tarea` (`entidad_tipo`/`estado`) confirmados en el Supabase de Santiago; migraciones 0004–0015 aplicadas. La bifurcación de dos ramas paralelas (2026-07-06) quedó reconciliada; el tronco oficial es `claude/business-erp-plan-kqb9uk`.
- **Fase 3 en curso** — **Citas (0017):** calendario del showroom (salas, tipos, candado anti doble-reserva, resultado obligatorio = funnel) en `/clientes/citas`, pestaña Citas en la ficha y "citas de hoy" en el Dashboard. Usable a mano ya; el bot reservará aquí cuando el riel esté vivo. **Envío asistido:** pestaña Conversación de la ficha → plantillas en tono Aurelle + botón que abre WhatsApp con el texto listo (humano envía, sin bridges). **Inbox shell (0018):** `/clientes/inbox` (lista + hilo con respuesta asistida), estructura conversacion/mensaje lista para el webhook. `docs/modulos/citas.md`, `docs/modulos/mensajeria.md`, `docs/modulos/inbox.md`.
- **Fase 4 en curso** — **Producción (0019):** kanban del taller en `/taller/produccion` (etapas, avanzar en 2 toques, atasco), detalle de orden con QC y **costos que alimentan el `costo_real` del pedido** (trigger → cierra el círculo con margen/comisiones), orden creable desde el pedido. **Documentos (sin migración + 0020):** contrato/recibo imprimibles + **e-firma**: `/firmar/[token]` pública (cliente firma sin cuenta, service_role por token) + tarjeta Documentos en el pedido (generar/compartir/cancelar). `<ContratoDoc>` compartido. `docs/modulos/produccion.md`, `docs/modulos/documentos.md`.
- **Envío asistido reusado (2026-07-07, sin migración):** botón `BotonWhatsApp` reusable en Pedido (recordatorio de saldo pendiente) y Cita (confirmación con fecha/hora en horario Monterrey). La Cita ahora expone `cliente_telefono`. **Fechas importantes:** `/clientes/fechas` + tarjeta en `/hoy` con cumpleaños y aniversarios de boda próximos y botón "Felicitar" (recurrencia anual anclada a Monterrey en `src/lib/fechas-clave.ts`). Todo corre sobre tablas ya en prod (0004–0018). `docs/modulos/mensajeria.md`.
- **Biblioteca de media (0021, 2026-07-07):** galería en `/taller/biblioteca` (filtro por tipo y etiqueta estilo/metal/piedra) + tarjeta "Renders y fotos" en la ficha del pedido (subir, aprobar render, eliminar). Archivos en bucket privado `media` con URLs firmadas de 1 h; versionado + "aprobado" en renders. Migración `0021_media.sql` (validada en Postgres local, cadena 0001–0021 completa) + `supabase/storage/media_setup.sql` (bucket + policies, se corre aparte). `docs/modulos/biblioteca-media.md`.
- **Biblioteca — enganches (2026-07-08):** (1) **envío del archivo por WhatsApp** asistido desde la galería del pedido (botón "Enviar", liga firmada en el texto); (2) **foto por etapa desde Producción** (la orden sube con `orden_id`+`etapa`, tipo `foto_etapa`; tarjeta de media en el detalle de la orden); (3) **render aprobado → orden a `aprobacion_cliente`** (solo hacia adelante, registra `orden_movimiento`). `docs/modulos/biblioteca-media.md`.
- **SQL combinado para prod:** `supabase/aplicar_0019_a_0021.sql` (0019+0020+0021+Storage en una transacción), validado en Postgres local sobre base a 0018.
- **Guardarraíl anti-bifurcación:** hook `SessionStart` (`.claude/`) que al iniciar cada sesión instala deps, imprime ESTADO y lista ramas paralelas. Protocolo de `CLAUDE.md` reforzado (paso 0 = detectar bifurcación). Lint en cero, build verde.

## Siguiente tarea exacta
Seguir Fase 4:
1. **Producción — completar:** asignar responsable desde la UI; atasco → tarea/notificación; checklist QC por tipo de pieza.
2. **Documentos — pulir:** disparo automático de contrato al confirmar; archivar firmado en la ficha; trazo de firma en canvas.
3. **Biblioteca (menor):** galería por cliente en la ficha 360; adjuntar binario en WhatsApp llega con el riel oficial.
Fase 3 (riel vivo de WhatsApp) sigue esperando el trámite de Meta de Santiago.
Patrón: migración → Postgres local → dominio → datos+muestra → acciones → páginas → docs.


## Reacciones de la matriz §4 (estado)
Implementadas: pago→ingreso (0010), consignación→CxP (0011), gasto recurrente→asiento mensual (0013), costo_produccion→costo_real (0019), **render aprobado→orden a aprobacion_cliente (0021, en `alternarAprobado`)**. Pendientes (fases posteriores): consumo de material en producción y contrato al confirmar (Fase 4); Postventa/Comisiones/lifecycle al entregar (Fases 4/6); tareas sugeridas por IA + Dashboard por rol + push.

## Problemas conocidos / bloqueos
- El sandbox de Claude no alcanza el Supabase/Vercel de Santiago (política de red). Verificación: build + Postgres local + `npm run start` con datos de muestra; producción se confirma con Santiago vía queries.
- Santiago debe estar dado de alta como admin en Supabase Auth para entrar a la app (confirmar que ya puede entrar).
- **Migraciones en prod: 0004–0018 aplicadas** + `CRON_SECRET`. **Pendientes: 0019, 0020, 0021 + Storage.** Se le mandó a Santiago `supabase/aplicar_0019_a_0021.sql` (las 3 + bucket privado `media` + policies, en UNA transacción) para pegar de una sola vez en el SQL Editor. Confirmar con él cuando lo aplique. Sin ellas: Producción no persiste, e-firma sin tabla `documento`, Biblioteca sin dónde guardar.

## Notas para la siguiente sesión
- **El hook `SessionStart` ya te muestra el estado y las ramas al arrancar. Léelo.** Si hay una rama `claude/*` más nueva que la tuya, reconcilia antes de codear.
- Postgres local para probar SQL: usuario `postgres` (no root) desde `/var/tmp`; stub de `auth` (roles authenticated/anon/service_role, `auth.users`, `auth.uid()`) + aplicar `supabase/migrations/00*.sql` en orden con `ON_ERROR_STOP=1`. No hacer pipe de `pgboot.sh` a `grep` o se pierde `$PSQL`.
- Capturas: `npm run build && npm run start` (sin llaves = datos de muestra) + Playwright `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
- Patrón firme: costo/margen/finanzas SIEMPRE en tabla aparte solo-admin (`item_costo`, `cotizacion_margen`, `pedido_costo`, `movimiento_financiero`, `proveedor`), nunca columna en la tabla principal — RLS es por fila, no por columna.
- Al crear formularios reusados en tarjetas angostas: `flex-wrap`, no `sm:flex-row` (breakpoints Tailwind son por viewport, no por contenedor).
