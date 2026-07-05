# DECISIONES — log técnico (append-only)

> Una línea por decisión: `fecha | decisión | por qué`. Nunca borrar; si una decisión se revierte, agregar línea nueva que la revierta. Buscar aquí ANTES de re-decidir cualquier cosa.

2026-07-05 | Stack: Next.js App Router + Supabase + Vercel | Decidido por Santiago en el Plan Maestro
2026-07-05 | WhatsApp vía Business Cloud API oficial, nunca bridges no oficiales | Riesgo de bloqueo del número
2026-07-05 | Tipografía de interfaz: Inter; fuentes de marca solo en PDFs generados server-side | Licencia de marca es desktop-only
2026-07-05 | CFDI/facturación fuera del ERP; campo folio_factura en ingresos | Lo maneja el contador externo
2026-07-05 | Esquema con sucursal_id desde día 1 | Expansión futura sin reconstrucción
2026-07-05 | Permisos vía RLS en base de datos, no solo en UI | Finanzas/márgenes solo-admin garantizado
2026-07-05 | ESTADO.md se sobreescribe; DECISIONES.md es append-only | Mantener costo de lectura por sesión mínimo
2026-07-05 | Next.js 16 + React 19 + Tailwind v4 (config CSS con @theme, sin tailwind.config.js) | Baseline de create-next-app; v4 usa tokens en CSS
2026-07-05 | shadcn/ui + cn() (clsx+tailwind-merge) + class-variance-authority + lucide-react | Sistema de componentes del plan (§5)
2026-07-05 | Rutas por área de navegación en grupo (app)/, no por tabla | Coincide con la navegación del §5 y con "trabajo real"
2026-07-05 | Roles como enum Postgres (admin/ventas/taller) + helpers SECURITY DEFINER es_admin/rol_actual/sucursal_actual | Base reusable de toda policy RLS sin recursión
2026-07-05 | Auditoría vía trigger genérico registrar_auditoria() adjunto por tabla; tabla auditoria append-only, SELECT solo-admin | Historial inmutable de quién/cuándo (§1)
2026-07-05 | Perfil de usuario se autocrea con trigger sobre auth.users; rol default 'ventas', admin se promueve a mano | Evita capturar dos veces; admin es decisión explícita
2026-07-05 | Ellion con id fijo 00000000-…-0001 como sucursal por defecto | Referenciable desde seeds y triggers
2026-07-05 | Auth en session.ts es stub (admin fijo) hasta provisionar Supabase | Permite construir y ver la UI sin nube; punto de integración documentado
2026-07-05 | zod para validación de formularios (Fase 1) | Recomendado en CONVENCIONES; estándar con TS
2026-07-05 | Interruptor supabaseConfigurado(): sin llaves usa datos de muestra + admin de prueba; con llaves va a Supabase real | Permite desarrollar y capturar pantallas sin acceso a la nube desde el sandbox
2026-07-05 | Capa de datos server-only por módulo + Server Actions con zod para escrituras | Patrón estándar Next 16 App Router; separa lectura/escritura y valida en servidor
2026-07-05 | Auth: @supabase/ssr con middleware + /login email-password; getUsuarioActual lee perfil de public.usuario | Patrón oficial Supabase para App Router; RLS sigue siendo la seguridad real
2026-07-05 | Pipeline de lead como enum estado_pipeline; cambio de etapa manual desde la ficha en v1 | El arrastre kanban y el auto-avance por eventos (Citas) llegan después
2026-07-05 | Datos de muestra de clientes viven en archivo aparte marcado como solo-local | Evita cualquier riesgo de que lleguen a producción
2026-07-05 | Costos de inventario en tabla aparte item_costo con RLS solo-admin (no columna) | RLS es por fila, no por columna; separar la tabla es la forma correcta de ocultar costo a ventas/taller
2026-07-05 | Trigger de auditoría deriva la PK del catálogo (0006), no asume columna 'id' | item_costo usa item_id; el trigger genérico de 0003 fallaba
2026-07-05 | Consignante como tabla ligera propia en Fase 1; se liga a Proveedores/CxP en Fase 2 | Inventario no debe esperar a Proveedores; buscar-o-crear por nombre
2026-07-05 | Áreas con submódulos (Taller, Ventas) usan landing con tarjetas + rutas hijas | Escala a Producción/Biblioteca/Cotizaciones/Pedidos sin romper navegación
2026-07-05 | Precio de metal: captura manual con histórico en Fase 1; API (MetalpriceAPI/GoldAPI) después | No bloquear el cotizador por elegir/pagar proveedor de API
2026-07-05 | Cotización de marca como página web imprimible (/imprimir/...), no PDF binario en v1 | Evita dep pesada + faltan archivos de fuentes de marca; browser guarda como PDF
2026-07-05 | Margen de cotización en tabla cotizacion_margen solo-admin (mismo patrón que item_costo) | Ventas ve total y líneas, nunca el costo/margen
2026-07-05 | Total de cotización se recalcula en el server action, no se confía en el cliente | Integridad del precio
2026-07-05 | Candado de anticipo 2 en pedido: override booleano admin + auditado (override_por/at) | §3.4 exige bloquear compra de materiales sin anticipo 2, con override explícito
2026-07-05 | Costo/margen real del pedido en tabla pedido_costo solo-admin; margen se sella al entregar | Mismo patrón de aislamiento de costos; margen real solo visible a admin
2026-07-05 | pago.registrado_por = auth.uid() forzado por RLS (anti-suplantación) | Trazabilidad de quién registró cada pago
2026-07-05 | Pedidos UI sigue el patrón Cotizador: data server-only + muestra + Server Actions + páginas | Consistencia; lectura/escritura separadas y validadas en servidor
2026-07-05 | Conversión cotización→pedido arranca en línea 'bridal' y se ajusta en el pedido | Un clic sin fricción; la línea es editable en el detalle
2026-07-05 | Reacciones de la matriz §4 de Pedidos quedan como comentarios TODO en actions.ts + ESTADO | Dependen de Finanzas/Producción/Postventa (Fases 2/4/6); no bloquear Fase 1
2026-07-05 | cambiarEstado('entregado') delega en entregarPedido para no saltarse el sellado de margen | El sellado debe correr sí o sí al entregar
