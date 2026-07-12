# Módulo: Contactos del gremio (tercerización)

> Directorio de a quién recurrir para tercerizar procesos del taller: joyeros,
> vaciadores, montadores, grabadores… con especialidad, tiempo de entrega y
> precios estimados. Pedido de Santiago 2026-07-11 ("a la vista, nada
> obligatorio, solo para enriquecer la data").

## Estado
Construido 2026-07-11. Migración 0037 (⚠️ pendiente en prod junto con 0036).

## Tabla (0037)
- `contacto_util` — nombre (único obligatorio), tipo (text libre; sugeridos:
  joyero/vaciador/montador/grabador/otro), contacto (tel/WhatsApp/correo, texto
  libre), especialidad, tiempo_entrega, precios_estimados, notas, sucursal_id.
- **RLS: lectura/escritura por sucursal para TODO el equipo** (admin ve todo) +
  auditoría. Decisión clave: NO se reusó `proveedor` (área Dinero, SOLO-ADMIN,
  ligada a CxP/compras) — esto es operativo y debe estar a la vista; los
  precios son referencias de lo que cobran terceros, no finanzas de Aurelle.

## Rutas / pantallas
- `/taller/contactos` — lista agrupada por oficio (tarjeta nueva en `/taller`).
  Alta con "Agregar contacto" (form desplegable), edición EN la fila (lápiz) y
  borrado con confirmación. Solo el nombre es obligatorio.

## Piezas
- `src/lib/contactos-utiles.ts` (tipos + oficios sugeridos + etiquetaTipo),
  `src/lib/data/contactos-utiles{,-muestra}.ts`,
  `src/app/(app)/taller/contactos/{page,actions}.tsx`,
  `src/components/taller/contacto-util.tsx` (form alta/edición unificado +
  item con edición en su lugar).

## Pendientes conocidos
- Búsqueda/filtro (con pocos contactos no hace falta; agregar si crece).
- Ligar a órdenes de producción ("tercerizado con X") — mejora posterior.
