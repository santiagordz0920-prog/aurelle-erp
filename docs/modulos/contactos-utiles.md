# Módulo: Contactos útiles (tercerización)

## Estado
Construido el 2026-07-11 (pedido directo de Santiago). Última modificación: 2026-07-11.

## Tablas
- `contacto_util` (0036) — directorio de oficios externos a los que se les puede encargar trabajo: `nombre` (único obligatorio), `tipo` (check: joyero/vaciador/montador/otro), `contacto`, `especialidad`, `tiempo_entrega`, `precio_estimado` y `notas` (todos texto libre opcional: es data para enriquecer, no registro contable). RLS estándar por sucursal para TODOS los usuarios autenticados (NO solo-admin) + auditoría.

## Rutas / pantallas
- `/taller/contactos` — directorio agrupado por oficio, con badges de tiempo de entrega y precio estimado. Alta con formulario colapsable (solo nombre obligatorio) y eliminación con confirmación. Visible para todos los roles; tarjeta propia en el índice de Taller.

## Eventos que emite / consume
- Ninguno (directorio de consulta). No toca la matriz §4.

## Lógica no obvia / trampas
- **NO confundir con `proveedor` (0012, `/dinero/proveedores`, solo-admin):** proveedor es a quién se le COMPRA (CxP, compras, Finanzas); `contacto_util` es a quién se le puede ENCARGAR un proceso (operativo, sin dinero amarrado). Si un contacto se vuelve proveedor formal, se da de alta aparte en Dinero.
- `precio_estimado` es texto libre informal de terceros — decidido explícitamente que NO es dato financiero de Aurelle, por eso la tabla no es solo-admin (ver DECISIONES 2026-07-11).
- Plurales de oficio en `pluralTipoContacto` (`src/lib/contactos-utiles.ts`): "montadores", no "montadors".

## Pendientes conocidos de este módulo
- Edición inline de un contacto (hoy: eliminar y recrear).
- Ligar un `contacto_util` a una orden de producción cuando se tercerice un proceso real (esperar a que el flujo exista de verdad).
