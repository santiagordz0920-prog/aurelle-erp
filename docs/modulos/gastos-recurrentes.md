# Módulo: Gastos recurrentes (Fase 2)

> Renta de Ellion, suscripciones, servicios: alta una vez, posteo automático
> mensual al ledger (§3.11). SOLO-ADMIN (área Dinero).

## Estado
Construido en Fase 2. Última modificación: 2026-07-06. Migración 0013.

## Tablas (migración 0013)
- `gasto_recurrente` — **SOLO-ADMIN**. concepto, monto, categoria (texto libre: renta/suscripción/servicio), periodicidad (texto, v1 solo 'mensual'), dia_cargo (1–28), activo, `ultimo_posteo` (primer día del mes ya posteado), sucursal_id.
- Función `postear_gastos_recurrentes()` — SECURITY DEFINER, idempotente por mes: para cada gasto activo no posteado este mes crea un `movimiento_financiero` (categoría `gasto`, origen `gasto_recurrente`, fecha = 1° del mes) y marca `ultimo_posteo`. Devuelve cuántos posteó. Probada en Postgres (3 la 1ª vez, 0 la 2ª).

## Rutas / pantallas
- `/dinero/gastos` — burn fijo mensual, alta rápida, lista de compromisos con badge (posteado/pendiente del mes), pausar/reactivar, botón "Postear este mes". Solo-admin (doble puerta: RLS + guard en la página). Enlace desde `/dinero`.
- `/api/cron/gastos` (GET) — endpoint que Vercel Cron llama el día 1 (`vercel.json`: `0 8 1 * *`). Protegido por `CRON_SECRET` (header `Authorization: Bearer`). Sin secreto → 401 (verificado). Usa el cliente service_role.

## Eventos que emite / consume
- **Emite** (matriz §4, "gasto recurrente día de cargo → Finanzas postea asiento"): el cron/botón crea el movimiento de gasto en el ledger. Tercer evento automático de Finanzas (tras pago→ingreso y consignación→CxP).

## Lógica no obvia / trampas
- **Idempotencia por mes** vía `ultimo_posteo`: postear dos veces el mismo mes no duplica. El botón manual y el cron llaman la misma función SQL.
- **Cron sin sesión** → usa `createAdminClient()` (service_role, salta RLS) en `src/lib/supabase/admin.ts`. Ese cliente es SOLO para rutas protegidas por secreto; nunca en flujos con datos de usuario.
- En modo local (sin Supabase) el botón simula el posteo marcando `ultimo_posteo` en los datos de muestra (no escribe ledger real).
- `periodicidad` es texto con check a solo 'mensual' en v1: semanal/anual requieren ampliar el check y la lógica de `date_trunc` en la función.

## Pendientes conocidos de este módulo
- Semanal/anual (hoy solo mensual).
- Histórico de cambios de monto / alerta de aumento (§3.11) — hoy el cambio queda en `auditoria` pero sin UI de "subió la renta".
- Edición de un gasto (hoy: alta + pausar/reactivar).
- Vista anual de compromisos (hoy: burn mensual total).

## Acción de Santiago (producción)
- Aplicar `supabase/migrations/0013_gastos_recurrentes.sql`.
- En Vercel → Settings → Environment Variables, definir `CRON_SECRET` (cualquier cadena larga). Vercel Cron manda ese secreto automáticamente al endpoint. Sin `CRON_SECRET` el endpoint responde 401 y el posteo mensual no corre (pero el botón manual sí sirve como respaldo).
