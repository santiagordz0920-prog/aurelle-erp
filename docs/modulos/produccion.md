# Módulo: Producción (Fase 4)

> El cockpit de Fer (§3.5): kanban de etapas, QC y costos que alimentan el
> margen del pedido. RLS por sucursal (taller/ventas/admin).

## Estado
Construido en Fase 4 (primer módulo). Última modificación: 2026-07-08. Migración 0019 (aplicada en prod).
v2: asignar responsable desde la UI, checklist de QC por tipo de pieza, atasco → tarea. Sin migración nueva.
v3 (2026-07-08): **checklist de QC editable desde la app** (migración 0023): los puntos ya no viven en código, se administran en `/taller/produccion/qc` (solo admin).

## Tablas (migración 0019 + 0023)
- `qc_checklist_item` (0023) — puntos del checklist de QC por `linea_negocio`, con `posicion`, `texto`, `activo`. RLS: lectura del equipo por sucursal; **escritura SOLO admin**. Semilla = el checklist que vivía en código.
- `orden_produccion` — 1:1 con pedido (unique), etapa (enum diseno→cad→aprobacion_cliente→casting→
  engaste→pulido→qc→listo_entrega), responsable_id, fecha_compromiso, **qc_ok** (candado a listo_entrega), notas.
- `orden_movimiento` — bitácora de cambios de etapa (desde/hasta, movido_por, cuándo) → tiempos reales por etapa.
- `costo_produccion` — capturable por taller (tipo casting/engaste/material/mano_obra/otro, concepto, monto).

## Rutas / pantallas
- `/taller/produccion` — **kanban** por etapa (columnas), tarjetas por orden, avanzar en 2 toques, alerta de atasco (≥7d). Activado en el landing `/taller`. Botón admin "Checklist de QC" (→ `/taller/produccion/qc`).
- `/taller/produccion/[id]` — etapa + control de QC (checklist de la línea) + costos (con total) + link al pedido + **tarjeta de fotos/archivos** (Biblioteca del pedido; sube con `orden_id`+`etapa` como `foto_etapa`). El admin ve "Editar checklist".
- `/taller/produccion/qc` — **admin only**: administra los puntos del checklist por línea (agregar, editar, reordenar, activar/desactivar, eliminar).
- En el pedido `/ventas/pedidos/[id]`: tarjeta **Producción** → "Crear orden de producción" (si no existe) o "Ver orden" con su etapa.
- Enganche con Biblioteca: aprobar un render mueve la orden a `aprobacion_cliente` (ver `docs/modulos/biblioteca-media.md`).

## Capa de datos / acciones
- `src/lib/produccion.ts`: etapas ordenadas, `siguienteEtapa`, `puedeCerrar` (QC), `diasEnEtapa`, `ATASCO_DIAS`, tipo **`QcChecklistItem`**, `lineaODefault`, **`QC_CHECKLIST` = default/semilla** (fallback en muestra o si la tabla no tiene puntos de esa línea).
- `src/lib/data/produccion.ts`: `listarOrdenes`, `getOrden`, `ordenDePedido`, **`listarChecklistQC`** (todos los puntos, admin), **`checklistDeLinea`** (puntos activos de una línea, para el QC de la orden).
- `src/app/(app)/taller/produccion/actions.ts`: `crearOrden`, `moverEtapa`, `marcarQC`, `agregarCostoProduccion`, **`asignarResponsable`**, **`crearTareaAtasco`**.
- `src/app/(app)/taller/produccion/qc-actions.ts` (v3, **admin only**): `agregarChecklistItem`, `editarChecklistItem`, `alternarChecklistItem`, `moverChecklistItem`, `eliminarChecklistItem`.
- Componentes: `asignar-responsable`, `qc-checklist` (guía pre-vuelo en la orden), `crear-tarea-atasco`, **`qc-checklist-editor`** (v3, editor admin por línea).

## Eventos que emite / consume (matriz §4)
- **Crear orden / mover etapa → sincroniza el estado del pedido:** al crear o avanzar, el pedido pasa a `en_produccion`; al llegar a `listo_entrega`, el pedido pasa a `listo_entrega`. (`sincronizarPedido`, no toca entregado/cancelado.)
- **Costo de producción → costo_real del pedido:** trigger `trg_costo_prod_suma` → `sumar_costo_produccion()` (SECURITY DEFINER) recomputa `pedido_costo.costo_real = Σ` costos de producción del pedido. **Cierra el círculo:** ese costo_real es el que sella el margen al entregar y el que usan las comisiones.
- **Candado QC:** no se puede mover a `listo_entrega` sin `qc_ok` (validado en `moverEtapa`).
- **Fotos por etapa → Biblioteca:** la orden sube fotos con `orden_id`+`etapa` (tipo `foto_etapa`) al bucket `media` (ver `docs/modulos/biblioteca-media.md`). Hecho.
- **Pendiente (requiere otros módulos):** aviso al cliente en etapa clave → lifecycle (riel WhatsApp); atasco → tarea automática/notificación por cron.

## Lógica no obvia / trampas
- **Checklist QC (`QcChecklist`) es una guía pre-vuelo:** los checks son efímeros (client-side, no se persisten); lo único que persiste es `qc_ok`. Con todos los puntos marcados se habilita "Marcar QC completo". "Reabrir QC" desmarca `qc_ok`. La lista depende de `linea_negocio` (default bridal si null).
- **Atasco → tarea (`crearTareaAtasco`):** la tarea se liga al **pedido** (`entidad_tipo='pedido'`) porque no hay entidad `produccion`; `origen='sugerida'`, prioridad alta, responsable = el de la orden o quien la crea. Aparece en `/hoy/tareas`.
- `costo_produccion` es capturable por taller (Fer conoce lo que paga); el **margen** sigue solo-admin (vive en `pedido_costo`). El trigger es SECURITY DEFINER para escribir esa tabla solo-admin.
- El recompute de `costo_real` es robusto (Σ, no incremento): borrar/editar un costo recalcula bien. Ojo: si había un `costo_real` capturado a mano (setCostoReal), el primer costo de producción lo REEMPLAZA por la suma real.
- Una orden por pedido (unique). "Crear orden" desde el pedido sólo si no existe.

## Lógica no obvia / trampas (v3)
- El checklist de la orden lee **puntos ACTIVOS** de la línea (`checklistDeLinea`); si la tabla no tiene puntos de esa línea, cae al default en código (`QC_CHECKLIST`) para no dejar el QC sin guía. Reordenar/editar/desactivar impacta el QC de las **próximas** cargas de orden (los checks son efímeros; no rompe órdenes en curso).
- En modo muestra el checklist vive en el array mutable `CHECKLIST_QC_MUESTRA` (sembrado de `QC_CHECKLIST`) para que el CRUD funcione local.

## Pendientes conocidos
- Aviso al cliente en etapa clave (p. ej. "entró a engaste") — depende del riel WhatsApp (Fase 3 vivo).
- Atasco → tarea **automática** por cron (hoy es un botón asistido en la orden atascada; la detección visual ya está en kanban y detalle).
