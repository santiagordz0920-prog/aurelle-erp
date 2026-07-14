-- ═══════════════════════════════════════════════════════════════════════════
-- 0039_asistente_accion — Fase 5 (Asistente interno del ERP §3.19 v2.1)
-- Bitácora de lo que el asistente EJECUTA por indicación del usuario: la regla
-- dura de §3.19 ("toda acción del asistente queda en la auditoría marcada como
-- 'vía asistente'"). Se hace en tabla propia y NO tagueando el trigger genérico
-- de auditoría porque marcar el canal exigiría fijar un GUC en la MISMA
-- transacción del cambio, cosa que el patrón de supabase-js (cada insert/update
-- es su propia transacción vía PostgREST) no permite limpio. Esta bitácora es
-- además más legible: guarda el resumen humano ("Registró pago de $10,000 al
-- pedido de Ana"), no diffs de filas.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.asistente_accion (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null default auth.uid() references public.usuario(id),
  accion       text not null,               -- 'registrar_pago', 'crear_cliente', …
  resumen      text not null,               -- legible, tal como se le mostró al usuario
  entidad_tipo text,                         -- 'pedido' | 'cliente' | 'cita' | 'cotizacion' | …
  entidad_id   text,
  sucursal_id  uuid not null references public.sucursal(id)
                 default '00000000-0000-0000-0000-000000000001',
  created_at   timestamptz not null default now()
);

create index idx_asistente_accion_created_at on public.asistente_accion (created_at desc);
create index idx_asistente_accion_usuario on public.asistente_accion (usuario_id);

alter table public.asistente_accion enable row level security;

-- Insert: el usuario logueado registra SU propia acción (el asistente corre con
-- su sesión). No puede escribir a nombre de otro.
create policy "asistente_accion_insert"
  on public.asistente_accion for insert to authenticated
  with check (usuario_id = auth.uid());

-- Lectura: admin ve toda la bitácora; cada quien ve la suya.
create policy "asistente_accion_select"
  on public.asistente_accion for select to authenticated
  using (public.es_admin() or usuario_id = auth.uid());

-- Sin update/delete: la bitácora no se altera.
