# ERP Aurelle — Plan Maestro v1

**Fecha:** 5 de julio 2026
**Estado:** Mapa funcional aprobado por Santiago. Este documento es la especificación maestra para construir el ERP con Claude Code.
**Stack:** Vercel (Next.js) + Supabase (base de datos, auth, storage, realtime) + WhatsApp Business Cloud API + Anthropic API (capa de IA).

---

## 0. Visión y principios

Un solo sistema donde vive **todo** Aurelle: cada cliente, cada conversación, cada pedido, cada piedra, cada peso. Reemplaza por completo los cuatro Google Sheets (Operaciones v1, Pricer v1, Contabilidad v1, Inventario) con migración de datos históricos.

**Principios de diseño:**

1. **El Pedido es la columna vertebral.** Todo fluye hacia él (lead → cita → cotización → pedido) y todo fluye desde él (inventario, producción, documentos, dinero, postventa). Ningún módulo vive aislado.
2. **WhatsApp es la superficie del cliente.** El cliente nunca ve el ERP; ve mensajes bien pensados en WhatsApp. El portal de cliente queda para una fase futura.
3. **Un dato se captura una vez.** Si el bot ya preguntó el nombre y la fecha de boda, nadie vuelve a teclearlos. Si el pedido ya tiene el precio, el contrato se genera solo.
4. **Registrar sin fricción.** Fer actualiza una etapa de producción en dos toques desde el celular. Santiago registra un pago en tres. Si registrar cuesta trabajo, la gente deja de registrar y el sistema muere (es lo que le pasó a las Sheets de Feb–Jun 2026).
5. **La entrega no es el final.** Cada pieza entregada genera fechas de aniversario, garantía y oportunidades de recompra que alimentan al CRM automáticamente.
6. **Roles desde el día 1.** Solo Santiago y Fer al inicio, pero los permisos de empleado (sin márgenes, sin finanzas, sin datos del socio capitalista) existen desde el principio.
7. **Multi-sucursal desde el esquema.** Toda tabla relevante lleva `sucursal_id`. Hoy solo existe Ellion; Los Cabos algún día será configuración, no reconstrucción.
8. **Idioma: español.** Toda la interfaz, notificaciones y documentos.

**Fuera de alcance (decisión explícita):**
- Facturación CFDI/SAT — la maneja el contador externamente. El ledger lleva un campo opcional `folio_factura` por ingreso para reconciliar.
- Broadcast masivo por segmentos — la mensajería es 1:1 y deliberada vía el motor de lifecycle.
- Módulos dedicados de Planners y UHNW — se cubren con etiquetas de fuente en CRM y comisiones en Finanzas hasta que esos canales existan de verdad.
- Portal de cliente web — fase futura.
- Nómina — fase futura.

---

## 1. Arquitectura técnica (explicada simple)

- **Vercel** hospeda la aplicación web (Next.js). Es lo que Santiago y Fer abren en el navegador o instalan como app en el teléfono (PWA).
- **Supabase** es la base de datos (PostgreSQL) + login + almacenamiento de archivos (fotos, renders, PDFs) + tiempo real (cuando Fer mueve una etapa, Santiago lo ve al instante sin recargar).
- **Row Level Security (RLS)** de Supabase implementa los permisos: la base de datos misma impide que un rol de empleado lea márgenes o finanzas, aunque alguien intente brincarse la interfaz.
- **WhatsApp Business Cloud API** (la API oficial de Meta): cada mensaje entrante llega por webhook al ERP y se guarda en la conversación del cliente. Las respuestas salen por la misma API. Mensajes libres dentro de la ventana de 24 h; fuera de ella, plantillas pre-aprobadas por Meta (cumpleaños, recordatorio de cita, "tu render está listo"). Esto es lo que evita bloqueos: es el canal sancionado por Meta, no un bridge pirata.
- **Anthropic API** es la capa de inteligencia: redacta respuestas en tono Aurelle, clasifica señales (2ct+, urgencia, presupuesto), sugiere tareas.
- **Vercel Cron** ejecuta los procesos programados: recordatorios de cita, campañas de aniversario, alertas de pedido atascado, actualización diaria de precio de metales.
- **Registro de auditoría:** toda escritura importante (cambio de precio, pago, etapa) guarda quién y cuándo.

---

## 2. Modelo de datos: la columna vertebral

Entidades centrales y sus relaciones (todas con `sucursal_id` donde aplica):

- **cliente** — persona. Nombre, teléfono (WhatsApp = identificador natural), fecha de nacimiento, fecha de boda, pareja, fuente (fase de ads/zona, expo, referido, orgánico), etiquetas, referido_por (cliente o contacto externo).
- **conversacion / mensaje** — todo el historial de WhatsApp por cliente, con dirección (entrante/saliente), autor (bot IA / humano / plantilla), y estado (enviado, leído).
- **cita** — cliente, fecha/hora, tipo (primera visita, entrega, servicio, noche privada), sala (piso / closing room), resultado (asistió / no asistió / cerró / cotizó).
- **cotizacion** — cliente, líneas (metal, quilataje, piedra central, laterales, montura), precio calculado por el motor, estado (borrador → enviada → seguimiento → aceptada → vencida), PDF generado.
- **pedido** — LA tabla central. Cliente, cotización origen, línea de negocio (Bridal / Concierge), plan de pagos (anticipos + parcialidades), piezas de inventario reservadas/consumidas, orden de producción, documentos, costo real acumulado, margen, estado global.
- **pago** — pedido, monto, fecha, método, tipo (anticipo 1 / anticipo 2 / parcialidad / liquidación). Genera asiento en Finanzas automáticamente.
- **orden_produccion / evento_produccion** — etapas, responsable, fotos, checklist QC, tiempos por etapa.
- **item_inventario / movimiento_inventario** — SKU, tipo (piedra suelta, diamante, montura, pieza terminada), propiedad (propio / consignación con consignante), certificado IGI adjunto, ubicación (vitrina X / taller / consignante), costo, estado (disponible / reservado / consumido / vendido).
- **proveedor / compra / cuenta_por_pagar** — directorio, historial, saldos.
- **movimiento_financiero** — el ledger: Deuda / Gasto / Capital / Ingreso / Costo / Pago Deuda, con vínculo al pedido/compra/gasto que lo originó y campo opcional `folio_factura`.
- **gasto_recurrente** — renta, suscripciones, servicios; se postea solo cada mes.
- **comision** — beneficiario (planner/referidor), pedido, % sobre utilidad, estado (devengada al cierre → pagada).
- **documento** — tipo (contrato, nota de remisión, cotización PDF), pedido/cliente, versión, estado de firma, archivo.
- **media** — renders, CADs, fotos; vinculados a cliente/pedido/item de inventario.
- **tarea** — título, responsable, vínculo (cliente/pedido/item), recurrencia, origen (manual / IA), vencimiento.
- **notificacion** — evento, destinatario, canal (in-app / WhatsApp interno), leída.
- **expo / expo_lead** — evento, costos, leads capturados con vínculo a cliente.
- **evento_lifecycle** — cliente, tipo (cumpleaños, aniversario boda, aniversario entrega, seguimiento post-visita), fecha programada, plantilla, estado.
- **plantilla_whatsapp** — plantillas aprobadas por Meta con variables.
- **usuario / rol / sucursal** — Santiago y Fer (admin), roles de empleado predefinidos.
- **articulo_conocimiento** — SOPs y guía IGI.

**Regla de oro de interconexión:** ningún módulo escribe datos que otro módulo necesita sin dispararle el evento correspondiente. La sección 4 (Matriz de interconexiones) lista cada evento y quién reacciona.

---

## 3. Módulos — buildout granular

Formato por módulo: **qué hace → funciones granulares → recibe de → alimenta a → automatizaciones.**

### 3.1 CRM y Mensajería (el núcleo)

**Qué hace:** todo cliente y toda conversación de WhatsApp viven aquí. Es la memoria comercial completa de Aurelle.

**Funciones:**
- Inbox unificado de WhatsApp: cada mensaje entrante crea o actualiza el registro del cliente automáticamente (el teléfono es el identificador).
- Ficha 360 del cliente: datos personales, fecha de boda, pareja, fuente de origen, historial completo de conversación, citas, cotizaciones, pedidos, pagos, documentos, media enviada, servicios postventa, referidos que ha traído — todo en una sola pantalla.
- Etiquetado de fuente automático: leads de ads llegan con fase/zona (wa.me con parámetro por campaña), leads de expo se importan del módulo Expos, referidos llevan `referido_por`.
- Pipeline de lead: nuevo → conversando → cita agendada → visitó → cotizado → cerrado / perdido (con motivo de pérdida).
- Respuestas IA por niveles:
  - **Automático** para lo rutinario: saludo inicial, preguntas de calificación, horarios, ubicación de Ellion, confirmaciones.
  - **Cola de aprobación** para lo sensible: señales 2ct+, presupuestos altos, quejas, negociación. La IA redacta el borrador en tono Aurelle; Santiago o Fer aprueban/editan desde una bandeja con un toque.
  - Toda respuesta IA queda marcada como tal en el historial.
- Motor de lifecycle (mensajería deliberada, todo 1:1 vía plantillas aprobadas):
  - Seguimiento post-visita si no cerró (día 2 y día 7, tono suave).
  - Recordatorio de anticipo pendiente.
  - Avances de pedido: "tu render está listo" (con imagen de la Biblioteca), "tu pieza entró a engaste".
  - Cumpleaños del cliente y de la pareja.
  - Aniversario de boda → campaña churumbela/eternity al año 1, 5, 10.
  - Aniversario de entrega → invitación a limpieza gratuita (reactivación).
  - Cada envío programado aparece en un calendario de lifecycle revisable; Santiago puede pausar o editar cualquier cadencia.
- Programa de referidos: al cerrar un pedido con `referido_por`, se registra el referido, se dispara agradecimiento al referidor y (si aplica) comisión o cortesía definida.
- Notas internas por cliente (invisibles al cliente).
- Búsqueda por nombre, teléfono, etiqueta, fuente, estado.

**Recibe de:** WhatsApp Cloud API (mensajes), Citas (resultados), Pedidos (estados y entregas), Expos (leads), Postventa (fechas de reactivación), Marketing (atribución de fuente).
**Alimenta a:** Citas (el bot agenda), Cotizador (datos del cliente pre-cargados), Marketing (funnel), Tareas (IA sugiere seguimientos), Dashboard.
**Automatizaciones:** creación de cliente al primer mensaje; escalamiento 2ct+ a humano con notificación inmediata; cadencias de lifecycle vía cron; conversación sin respuesta >24 h → tarea.

### 3.2 Citas

**Qué hace:** calendario del showroom Ellion con reserva automática del bot.

**Funciones:**
- Calendario por sala: piso de ventas / closing room, con duración por tipo de cita.
- El bot ofrece horarios disponibles reales y reserva directamente (nunca doble-reserva).
- Confirmación inmediata por WhatsApp + recordatorio 24 h antes y 2 h antes (plantillas).
- Registro de resultado obligatorio al cerrar la cita: asistió / no asistió / cotizó / cerró — un toque desde el celular. Este dato ES el funnel.
- No-show → re-engagement automático suave al día siguiente.
- Tipos especiales: entrega de pieza (ligada al pedido), servicio postventa, noche privada.
- Vista semanal para Santiago (que cierra en fin de semana) y "citas de hoy" en el Dashboard.

**Recibe de:** CRM/bot (reservas), Pedidos (citas de entrega), Postventa (citas de servicio).
**Alimenta a:** CRM (resultado → pipeline), Marketing (tasa inquiry→visita, EL KPI), Notificaciones, Dashboard.
**Automatizaciones:** confirmaciones y recordatorios; alerta interna "cita en 1 h"; no-show → lifecycle.

### 3.3 Cotizador

**Qué hace:** reemplaza Pricer v1. Motor de precios con feed automático de metales y generador de cotización PDF de marca en un clic.

**Funciones:**
- Feed diario automático de precio de oro/platino/paladio/plata (API de precios de metales) con tipo de cambio USD/MXN; histórico guardado.
- Reglas de margen por categoría configurables solo por Santiago (los empleados jamás ven la fórmula, solo el precio final).
- Constructor de cotización: metal + quilataje, piedra central (desde inventario propio/consignación o por especificación a conseguir), laterales, tipo de montura, talla. Precio siempre de la **pieza completa** — nunca se muestra precio por quilate (protección contra la deflación del diamante de laboratorio).
- Si la piedra viene del inventario, el costo real del item alimenta el margen calculado.
- Simulador interno de margen (visible solo para admin): costo estimado vs precio → utilidad por pieza.
- PDF de cotización con identidad Aurelle (wordmark, sello de grulla, tipografías de marca), enviable por WhatsApp en un clic desde la conversación.
- Estados con seguimiento: enviada → seguimiento (IA sugiere tarea si no hay respuesta en X días) → aceptada (convierte a pedido con un clic) → vencida (los precios de metal caducan a N días).
- Tasa de conversión cotización→pedido medible por fuente y por rango de precio.

**Recibe de:** API de metales (precios), Inventario (piedras y costos reales), CRM (cliente).
**Alimenta a:** Pedidos (conversión directa), Documentos (el PDF), Finanzas (margen proyectado), Marketing (conversión por fuente).
**Automatizaciones:** actualización diaria de precios vía cron; expiración de cotizaciones; tarea de seguimiento automática.

### 3.4 Pedidos (la columna vertebral)

**Qué hace:** el objeto central del negocio. Todo lo demás cuelga de aquí.

**Funciones:**
- Conversión desde cotización con un clic: cliente, especificaciones, precio y margen viajan automáticamente.
- Línea de negocio obligatoria: **Bridal** / **Concierge** — hace medible el umbral 25–30 % de Concierge sin módulo aparte.
- Plan de pagos integrado:
  - Anticipo etapa 1 (gancho de conversión, típicamente $1 k).
  - Anticipo etapa 2 (30 %+ antes de comprar materiales — la regla de capital de trabajo).
  - Parcialidades/apartado: calendario de pagos con montos y fechas, saldo pendiente siempre visible.
  - **Candado configurable:** la orden de producción no puede pasar a compra de materiales si el anticipo 2 no está registrado (override explícito de Santiago posible, y queda auditado).
- Registro de pago en 3 toques: monto, método, tipo → asiento automático en Finanzas + nota por WhatsApp si se desea.
- Reserva de inventario: al confirmar el pedido, las piezas asignadas pasan a "reservado"; al entrar a producción, a "consumido". Si la piedra es de consignación, se genera la cuenta por pagar al consignante.
- Costo real acumulado: materiales consumidos + costos de producción capturados → margen real vs margen cotizado, visible solo para admin.
- Estado global de un vistazo: cobrado / por cobrar / etapa de producción / fecha compromiso / días restantes.
- Semáforo de fecha compromiso: verde / amarillo (quedan <X días y no está en etapa final) / rojo (vencido).
- Al marcar **entregado**: se dispara Postventa (garantía + aniversarios), se cierra el ciclo financiero y el margen real queda sellado.

**Recibe de:** Cotizador, CRM, Pagos, Producción (avances y costos), Inventario (costos reales).
**Alimenta a:** Producción (crea la orden), Inventario (reserva/consumo), Documentos (contrato + nota autogenerados), Finanzas (ingresos, costos, capital de trabajo), Postventa (al entregar), Comisiones (si hay referidor), Dashboard.
**Automatizaciones:** creación de contrato al confirmar; recordatorios de parcialidad vencida; alerta de pedido sin movimiento; capital atrapado por pedido en tiempo real.

### 3.5 Producción (el cockpit de Fer)

**Qué hace:** taller completo, reemplaza el lado operativo de Operaciones v1.

**Funciones:**
- Tablero kanban de etapas: **diseño → CAD → aprobación cliente → casting → engaste → pulido → QC → listo para entrega**. Etapas configurables.
- Cada tarjeta = una orden ligada a su pedido: especificaciones completas, piedras asignadas (con foto y certificado a un toque), fecha compromiso, responsable.
- Mover de etapa en dos toques desde el celular; cada movimiento guarda quién y cuándo → tiempos reales por etapa.
- Fotos por etapa (subidas desde el celular, van directo a la Biblioteca de media del pedido).
- Aprobación de render por el cliente: el render se envía por WhatsApp desde el CRM; la confirmación del cliente marca la etapa como aprobada.
- Checklist de QC configurable por tipo de pieza (talla, piedras firmes, pulido, grabado, peso) — no se puede marcar "listo para entrega" sin QC completo.
- Captura de costos de producción por orden: casting externo, engaste, materiales extra → alimentan el costo real del pedido.
- Alerta de atasco: orden con más de N días en una etapa → notificación a Fer y tarea automática.
- Vista de carga del taller: órdenes por etapa, cuellos de botella visibles.

**Recibe de:** Pedidos (órdenes nuevas), Inventario (materiales).
**Alimenta a:** Pedidos (avance y costos reales), CRM/lifecycle (avisos de avance al cliente), Biblioteca de media (fotos), Tareas (atascos), Dashboard, Notificaciones.
**Automatizaciones:** notificación al cliente en etapas clave (configurable); alerta de atasco; QC obligatorio antes de entrega.

### 3.6 Inventario

**Qué hace:** reemplaza la Sheet Inventario. Cada piedra, montura y pieza terminada con su historia completa.

**Funciones:**
- SKU único por item con fotos y certificado IGI adjunto (PDF/imagen).
- Tipos: piedra suelta de color, diamante (con 4Cs registradas), montura, pieza terminada, churumbela.
- Propiedad: **propio** vs **consignación** (A1–A27 y futuros), con consignante vinculado y condiciones de liquidación.
- Al venderse un item de consignación: cuenta por pagar automática al consignante en Finanzas, con estado (pendiente → liquidada).
- Ubicación física: vitrina específica de Ellion / taller / con consignante / apartado para pedido X. Vista "qué hay en cada vitrina" (planeación visual del piso — resuelve el problema de vitrinas vacías).
- Estados: disponible → reservado (pedido confirmado) → consumido/vendido. Bloqueo de doble reserva.
- Movimientos con historial: entrada (compra / consignación), salida (venta, devolución a consignante), transferencia de ubicación.
- Alertas de stock bajo por categoría (ej. monturas solitario oro blanco < N) → notificación + tarea.
- Sugerencia de recompra: qué categorías rotan más rápido, ligada al proveedor habitual con su último precio.
- Valor total del inventario propio (a costo) visible en Finanzas — parte del capital de trabajo.

**Recibe de:** Proveedores (compras), Pedidos (reservas/consumos), consignantes (altas).
**Alimenta a:** Cotizador (piedras disponibles con costo), Pedidos (asignación), Finanzas (valor de inventario, CxP consignación), Producción (materiales), Tareas/Notificaciones (stock bajo), Dashboard.
**Automatizaciones:** CxP automática al vender consignación; alertas de stock; bloqueo de doble reserva.

### 3.7 Postventa

**Qué hace:** convierte cada entrega en la siguiente venta.

**Funciones:**
- Al entregar un pedido se crea automáticamente el registro de pieza entregada: fecha, garantía (términos configurables), fechas de aniversario (boda del cliente + aniversario de entrega).
- Servicios: limpieza, ajuste de talla, reparación, re-rodinado — cada uno con cita, costo (o cortesía) y registro en el historial de la pieza.
- Campañas automáticas de lifecycle: invitación a limpieza gratuita al año, campaña churumbela/eternity en aniversarios clave, felicitación de aniversario de boda.
- Historial de la pieza consultable cuando el cliente escribe "se me aflojó una piedra" — el contexto completo aparece en la conversación.
- Métrica de recompra: % de clientes que regresan, valor de segunda compra.

**Recibe de:** Pedidos (entregas), Citas (servicios), CRM (solicitudes).
**Alimenta a:** CRM/lifecycle (campañas de reactivación), Citas (agenda de servicios), Finanzas (ingresos por servicios), Dashboard (recompra).
**Automatizaciones:** creación del registro al entregar; programación de aniversarios; recordatorio de garantía por vencer.

### 3.8 Biblioteca de media

**Qué hace:** todos los renders (Higgsfield), CADs y fotos, organizados por cliente y pedido, enviables en un clic.

**Funciones:**
- Carpeta automática por pedido: renders de diseño, CAD, fotos por etapa de producción, foto final.
- Subida desde celular o escritorio; almacenamiento en Supabase Storage.
- Envío directo por WhatsApp desde la conversación del cliente (el archivo correcto, sin buscar en el teléfono).
- Galería general de piezas terminadas etiquetada (estilo, metal, piedra) — material para marketing y para mostrar en citas ("algo así como esta").
- Versionado de renders (v1, v2 aprobado).

**Recibe de:** Producción (fotos), Santiago (renders Higgsfield), Documentos.
**Alimenta a:** CRM (envíos), Producción (referencia visual), Marketing (galería).

### 3.9 Finanzas

**Qué hace:** reemplaza Contabilidad v1 completa y agrega lo que las Sheets nunca pudieron: capital de trabajo en vivo, comisiones y reporte al socio.

**Funciones:**
- Ledger con las categorías actuales: Deuda / Gasto / Capital / Ingreso / Costo / Pago Deuda. Cada asiento vinculado a su origen (pedido, compra, gasto recurrente, comisión) — la mayoría se generan solos.
- Campo opcional `folio_factura` por ingreso (reconciliación con el contador; CFDI fuera del ERP).
- P&L mensual automático: ingresos por línea (Bridal/Concierge), costo de ventas, gastos operativos, utilidad. Comparativo mes a mes.
- **Capital de trabajo en vivo:** por cada pedido activo, costos ya incurridos menos pagos ya recibidos = capital atrapado. Suma total visible siempre. Es la métrica que gobierna la regla del anticipo 30 %.
- Proyección de flujo: parcialidades programadas por cobrar + pipeline de cotizaciones ponderado + gastos recurrentes conocidos → caja proyectada a 30/60/90 días.
- Comisiones por pagar: devengadas al cierre del pedido (planners, referidores), % sobre utilidad real, estado pendiente → pagada.
- Cuentas por pagar unificadas: proveedores + consignantes + comisiones, con vencimientos.
- **Reporte al socio capitalista:** vista mensual exportable (PDF) con trayectoria de crecimiento (ventas, tendencia, pipeline) — la condición del capital al 0 % es mantener crecimiento; este reporte lo documenta sin trabajo manual.
- Métricas de negocio: ticket promedio, margen promedio por línea, % Concierge sobre ingresos (el umbral del atelier), ventas mensuales vs meta $100 k/mes (el trigger de la marca de plata).
- Visibilidad: TODO este módulo es solo-admin. Los roles de empleado no ven nada de Finanzas.

**Recibe de:** Pedidos/Pagos, Inventario (consumos y valor), Proveedores (CxP), Gastos recurrentes, Comisiones, Postventa (servicios).
**Alimenta a:** Dashboard (números diarios), reporte al socio.
**Automatizaciones:** asientos automáticos desde todos los módulos; P&L de cierre de mes; alerta de CxP por vencer; cálculo continuo de capital de trabajo.

### 3.10 Proveedores

**Qué hace:** directorio y cuentas por pagar de todo a quien Aurelle le compra.

**Funciones:**
- Directorio: datos de contacto, categorías (metales, piedras, casting, empaque), condiciones de pago.
- Registro de compras ligado a inventario (una compra da de alta items automáticamente) o a gasto.
- Cuentas por pagar con vencimientos y estado; historial de precios por proveedor y por categoría (¿subió el casting?).
- Vínculo con sugerencias de recompra de Inventario: "monturas solitario bajas → último proveedor X a $Y".

**Recibe de:** Inventario (necesidades), Finanzas (pagos realizados).
**Alimenta a:** Inventario (altas por compra), Finanzas (CxP y costos).

### 3.11 Gastos recurrentes

**Qué hace:** renta de Ellion, suscripciones, servicios — se registran una vez y se postean solos.

**Funciones:**
- Alta de gasto con monto, periodicidad, día de cargo y categoría.
- Posteo automático mensual al ledger + notificación de "gastos posteados este mes".
- Vista anual de compromisos fijos (burn fijo mensual, dato clave para la proyección de flujo).
- Alerta de aumento: si un gasto cambia de monto, se registra el histórico.

**Recibe de:** configuración de Santiago.
**Alimenta a:** Finanzas (ledger y proyección).

### 3.12 Documentos

**Qué hace:** contratos y notas de remisión generados desde los datos del pedido, firmados y archivados sin tocar Word.

**Funciones:**
- Generación automática al confirmar pedido: contrato con datos del cliente, especificaciones, plan de pagos, términos — con identidad Aurelle completa (wordmark, sello de grulla, tipografías de marca, campo "Firma cliente" en blanco cuando se imprime).
- Nota de remisión por cada pago o a la entrega.
- **E-firma vía WhatsApp:** el cliente recibe un link, revisa el documento y firma desde el teléfono (trazo + aceptación con evidencia: fecha, hora, número). El documento firmado se archiva automáticamente en su ficha.
- Opción de impresión física para quien prefiera firmar en el showroom (flujo actual preservado).
- Versionado: si el pedido cambia (upgrade de piedra), se genera adenda, no se pierde el original.
- Plantillas editables por Santiago (texto legal, términos de garantía) sin tocar código.

**Recibe de:** Pedidos (datos), Cotizador (PDFs), Pagos (notas).
**Alimenta a:** CRM (archivo en ficha), cliente (vía WhatsApp).
**Automatizaciones:** generación al confirmar pedido; recordatorio de contrato sin firmar a las 48 h.

### 3.13 Marketing

**Qué hace:** el funnel completo con dinero real: de peso gastado en Meta a pedido cerrado, por zona y campaña.

**Funciones:**
- Funnel por fuente: inquiries → citas agendadas → visitas → cotizaciones → cierres, con tasas en cada paso. **KPI central: inquiry→visita > 5 %.**
- Desglose por fase geográfica (Fase 1 SPGG+Carretera / Fase 2 San Jerónimo+Tec / Fase 3 Cumbres), por campaña y por tipo de ad set (geo-only / intent / Advantage+).
- Importación de gasto publicitario desde Meta (Marketing API o carga manual/CSV como fallback) → **CAC por zona y por campaña**, costo por visita, costo por cierre.
- Atribución automática: el parámetro del wa.me de cada campaña marca la fuente del lead al entrar al CRM.
- Comparativo de canales: ads vs expos vs referidos vs orgánico — costo, conversión y ticket promedio por canal.
- Vista de decisión: "¿Fase 2 ya validó conversión para abrir Fase 3?" con los números en pantalla.

**Recibe de:** CRM (leads con fuente), Citas (visitas), Pedidos (cierres y tickets), Meta (gasto), Expos (canal).
**Alimenta a:** Dashboard, decisiones de presupuesto de Santiago.
**Automatizaciones:** sincronización de gasto; alerta si inquiry→visita cae bajo el umbral N días seguidos.

### 3.14 Expos

**Qué hace:** el archivo de investigación de 25 expos se vuelve un sistema vivo de ROI por evento.

**Funciones:**
- Calendario de expos con estado: candidata → contratada → ejecutada, con costos (stand, viáticos, material) y contactos del organizador.
- Captura rápida de leads en el stand (formulario móvil de 20 segundos: nombre, teléfono, fecha de boda) → entran al CRM con fuente = esa expo, y el bot les escribe el seguimiento el mismo día.
- ROI por expo: costo total vs leads → citas → cierres → ingreso generado. Ranking histórico de expos (valida la tesis: regionales de Monterrey > CDMX/GDL).
- Gancho de conversión de expo: anticipo etapa 1 ($1 k) registrable en el stand, ligado a pedido tentativo.

**Recibe de:** investigación existente (importación inicial del Excel), leads en vivo.
**Alimenta a:** CRM (leads), Marketing (comparativo de canal), Finanzas (costos), Dashboard.

### 3.15 Tareas

**Qué hace:** la lista de pendientes de los fundadores, conectada a la realidad del negocio.

**Funciones:**
- Tareas vinculables a cualquier entidad: cliente, pedido, item de inventario, expo, proveedor. Desde la ficha de un cliente se crea "llamar a Ana por el CAD" en dos toques.
- Asignación (Santiago / Fer / futuro empleado), vencimiento, prioridad.
- Recurrentes: "revisar precios de metales vs mercado (mensual)", "conteo físico de vitrinas (semanal)".
- **Sugeridas por IA** desde la actividad del sistema: cotización sin respuesta 5 días, conversación caliente abandonada, pedido atascado en casting 8 días, stock bajo, contrato sin firmar. Cada sugerencia se acepta o descarta en un toque.
- Vista "Hoy": mis tareas del día + las sugerencias nuevas, primera pantalla del ERP.

**Recibe de:** todos los módulos (eventos → sugerencias), captura manual.
**Alimenta a:** Dashboard, Notificaciones.

### 3.16 Dashboard y Notificaciones

**Qué hace:** el pulso diario del negocio, distinto por rol.

**Funciones:**
- **Vista Santiago:** ventas del mes vs meta, pipeline (cotizaciones vivas y su valor), citas de hoy/semana, funnel de la semana, capital de trabajo atrapado, caja proyectada, cola de aprobación de mensajes IA, tareas de hoy.
- **Vista Fer:** carga del taller por etapa, atascos, entregas comprometidas esta semana, QC pendientes, stock bajo, sus tareas.
- Notificaciones inteligentes (in-app + push): lead con señal 2ct+, cita en 1 h, pago recibido, anticipo/parcialidad vencida, pedido atascado, stock bajo, contrato sin firmar, mensaje esperando aprobación.
- Configurables: cada quién elige qué le llega como push y qué solo in-app.

**Recibe de:** todos los módulos.
**Alimenta a:** decisiones diarias.

### 3.17 Usuarios y Permisos

**Qué hace:** quién ve qué, garantizado a nivel base de datos (RLS), no solo escondido en la interfaz.

**Roles día 1:**
- **Admin (Santiago, Fer):** todo.
- **Ventas (futuro):** CRM, Citas, Cotizador (solo precio final, sin fórmula ni márgenes), Pedidos (sin costos ni margen), Documentos, Biblioteca. Sin Finanzas, sin datos del socio, sin reglas de precio.
- **Taller (futuro):** Producción, Inventario (sin costos), Biblioteca, sus Tareas.
- Registro de auditoría consultable: quién cambió qué y cuándo.

### 3.18 Base de conocimiento

**Qué hace:** los SOPs y la guía IGI viven dentro del ERP, listos para el onboarding de empleados.

**Funciones:**
- Artículos organizados por área (ventas, taller, atención) con búsqueda.
- Importación de la guía IGI en español y los materiales de entrenamiento existentes.
- Vinculable desde tareas ("lee el SOP de QC antes de tu primer checklist").
- Editable por admins sin tocar código.

### 3.19 Asistente interno del ERP (copiloto de Santiago y Fer)

**Qué hace:** un chat de Claude DENTRO del ERP (botón flotante, como el widget del Inbox) para operar el sistema con texto en lenguaje natural. No es el bot de WhatsApp (ese habla con clientes); este habla con Santiago y Fer y ejecuta acciones en el módulo correcto: "regístrale un pago de $10,000 al pedido de Rodrigo", "agenda cita con Mariana el jueves 5 pm", "¿cuánto llevamos vendido este mes?", "crea una tarea para Fer de pulir el anillo de Sofía".

**Cómo funciona (simple):** el asistente usa la misma API de Anthropic que el bot de WhatsApp, pero con **herramientas** (tool use): cada herramienta es una acción que el ERP ya sabe hacer (crear cliente, agendar cita, registrar pago, mover etapa de producción, consultar ventas…). Claude lee el mensaje, decide qué herramienta usar y con qué datos, y el ERP la ejecuta con el mismo código de siempre. No hay caminos nuevos a la base de datos: el asistente es otra "mano" que aprieta los mismos botones.

**Funciones (v1):**
- **Consultas:** ventas del mes, pipeline, citas de hoy, stock, saldo de un pedido — respuesta con datos reales del ERP y liga a la pantalla correspondiente.
- **Altas simples:** cliente, tarea, nota en la ficha, cita (validando choque de horario).
- **Confirmación previa SIEMPRE que hay dinero o algo difícil de deshacer:** el asistente muestra "Voy a registrar pago de $10,000 al pedido PED-023 de Rodrigo — ¿confirmas?" y solo ejecuta con el sí. Consultas y altas triviales no piden confirmación.

**Funciones (v2):**
- Acciones encadenadas ("convierte la cotización de Ana en pedido y genera el contrato").
- Ediciones/correcciones ("cámbiale el teléfono a Mariana", "mueve la cita al viernes").
- Pagos y movimientos de Finanzas (solo-admin, siempre con confirmación).
- Contexto de pantalla: si estás viendo un pedido, "súbele una nota" entiende a cuál.

**Reglas duras (no negociables):**
- Corre con la **sesión del usuario logueado** (no con permisos de sistema): RLS manda. Si un rol no puede ver Finanzas, su asistente tampoco.
- Toda acción del asistente queda en la **auditoría** marcada como "vía asistente".
- El asistente **nunca ejecuta SQL libre**: solo el catálogo de herramientas definido, una por una.
- Nada de borrar registros ni tocar producción/migraciones desde el chat.

**Recibe de:** todos los módulos (lectura según rol).
**Alimenta a:** el módulo que corresponda a cada orden; las reacciones de la matriz §4 se disparan igual que si se hubiera capturado a mano.

---

## 4. Matriz de interconexiones

Cada evento del sistema y quién reacciona. Esta matriz es contrato: si un módulo emite el evento, los módulos listados DEBEN reaccionar.

| Evento | Emisor | Reaccionan |
|---|---|---|
| Mensaje entrante WhatsApp | Cloud API | CRM crea/actualiza cliente y conversación; IA clasifica; si 2ct+ → Notificación + cola humana |
| Cita reservada | Bot/CRM | Citas bloquea horario; plantilla de confirmación; Notificación interna |
| Resultado de cita registrado | Citas | CRM actualiza pipeline; Marketing actualiza funnel; si no-show → lifecycle re-engagement |
| Cotización enviada | Cotizador | CRM registra en ficha; Tareas programa seguimiento; Marketing registra |
| Cotización aceptada | Cotizador | Pedido creado; Documentos genera contrato; Inventario reserva piezas |
| Anticipo 2 (30 %) registrado | Pagos | Finanzas asienta ingreso; Producción desbloquea compra de materiales; capital de trabajo recalcula |
| Pago registrado (cualquiera) | Pagos | Finanzas asienta; saldo del pedido actualiza; nota de remisión opcional; Notificación |
| Parcialidad vencida | Cron | Notificación interna; lifecycle recordatorio suave al cliente; Finanzas marca |
| Pieza reservada/consumida | Pedidos | Inventario cambia estado; si consignación → Finanzas crea CxP al consignante; costo real del pedido suma |
| Etapa de producción avanza | Producción | Pedido actualiza estado; si etapa clave → lifecycle avisa al cliente; tiempos por etapa registran |
| Render subido | Biblioteca | Producción habilita envío de aprobación; CRM puede enviarlo en un clic |
| QC completo | Producción | Pedido pasa a "listo para entrega"; Citas sugiere agendar entrega; Notificación a Santiago |
| Pedido entregado | Pedidos | Postventa crea registro (garantía + aniversarios); Finanzas sella margen real; Comisiones devenga si hay referidor; lifecycle agradece |
| Aniversario/cumpleaños llega | Cron | Lifecycle envía plantilla; CRM registra el toque |
| Stock bajo | Inventario | Notificación; Tarea; sugerencia de recompra con proveedor |
| Compra a proveedor | Proveedores | Inventario da de alta items; Finanzas crea CxP/costo |
| Gasto recurrente (día de cargo) | Cron | Finanzas postea asiento; Notificación mensual |
| Cierre de mes | Cron | Finanzas genera P&L; reporte al socio disponible; Marketing consolida CAC del mes |
| Cotización/conversación fría | Cron + IA | Tareas sugiere acción; Notificación agrupada diaria |
| Contrato sin firmar 48 h | Cron | Notificación; Tarea; recordatorio opcional al cliente |
| Lead capturado en expo | Expos | CRM crea cliente con fuente; bot inicia seguimiento el mismo día |
| Orden ejecutada vía asistente interno | Asistente (§3.19) | El módulo destino reacciona idéntico a una captura manual (aplican los eventos de esta matriz); Auditoría registra "vía asistente" |

---

## 5. Front-end y experiencia de uso

El ERP debe sentirse como un producto premium y simple — no como un ERP corporativo. Dos personas no técnicas lo van a usar todos los días desde el celular; si algo toma más de tres toques, está mal diseñado.

**Stack de interfaz:** Next.js (App Router) + Tailwind CSS + shadcn/ui como sistema de componentes. **PWA instalable**: Santiago y Fer lo agregan a la pantalla de inicio del teléfono y se abre como app, con notificaciones push.

**Principios UX:**

1. **"Hoy" es la pantalla de inicio.** Al abrir: citas de hoy, mensajes esperando aprobación, tareas del día, alertas. Nadie navega para saber qué toca hacer.
2. **Máximo 2 toques a cualquier cliente.** Búsqueda global permanente (barra arriba en móvil, Cmd+K en escritorio): teclear "Ana" muestra cliente, pedido, conversación.
3. **Mobile-first de verdad.** Fer mueve etapas y sube fotos desde el taller; Santiago aprueba mensajes desde el piso de ventas. La versión de escritorio es para trabajo profundo (finanzas, configuración); la de celular es para operar.
4. **Kanban donde hay flujo:** pipeline de leads, cotizaciones y producción son tableros arrastrables. Las listas se reservan para catálogos (inventario, proveedores).
5. **Ficha 360:** la pantalla de cliente lo muestra TODO (conversación, citas, pedidos, pagos, documentos, media) en pestañas — nunca hay que saltar entre módulos para entender a un cliente.
6. **Cola de aprobación como bandeja:** los borradores de la IA se aprueban/editan/descartan uno por uno, deslizando, como un inbox. Debe tomar segundos.
7. **Formularios de captura rápida:** registrar pago = 3 campos; mover etapa = 2 toques; lead de expo = 20 segundos. Los formularios largos (alta de pedido manual) se rompen en pasos.
8. **Los números sensibles se esconden por rol,** no por página: la misma pantalla de pedido muestra margen a un admin y no lo muestra a ventas.
9. **Estados vacíos que enseñan:** cada módulo nuevo explica en pantalla qué hace y cuál es el primer paso.

**Identidad visual:**
- Paleta: fondo crema `#F5F2EB`, verde bosque `#08221B` como color primario (navegación, botones principales), dorado antiguo `#B77321` solo como acento (estados activos, highlights) — usado con moderación para que se sienta premium y no dorado-chillante.
- Modo claro únicamente en v1 (consistencia de marca).
- **Tipografía de interfaz: Inter** (gratuita, excelente en pantallas pequeñas). Las tres tipografías de marca (Feature Deck, Styrene A, Atlas Grotesk) tienen licencia solo de escritorio — usarlas en la web del ERP violaría la licencia. Se reservan para los **documentos PDF generados** (contratos, cotizaciones, notas), que se producen del lado del servidor donde la licencia de escritorio aplica. Si más adelante se compran licencias webfont, cambiar la fuente del ERP es un ajuste de una línea.
- Densidad: generosa en móvil (botones grandes, tocables), compacta en escritorio (tablas de finanzas e inventario).

**Navegación (barra lateral en escritorio, tabs + menú en móvil), agrupada por trabajo real:**
- **Hoy** — dashboard + tareas + aprobaciones
- **Clientes** — CRM, conversaciones, citas
- **Ventas** — cotizaciones, pedidos
- **Taller** — producción, inventario, biblioteca
- **Dinero** — finanzas, proveedores, gastos, comisiones *(solo admin)*
- **Crecimiento** — marketing, expos *(solo admin)*
- **Sistema** — usuarios, plantillas, conocimiento, configuración

---

## 6. Plan de desarrollo por fases

Orden diseñado por dependencias y por valor inmediato: primero lo que reemplaza las Sheets (dolor diario), luego el riel de WhatsApp, y la IA al final porque necesita que los datos ya fluyan. Cada fase termina en algo usable en producción — nunca hay un "gran lanzamiento" riesgoso.

**Fase 0 — Fundaciones** *(tamaño: chico)*
Proyecto Next.js + Supabase en Vercel; login; roles y RLS; dimensión `sucursal_id` en el esquema; sistema de diseño (colores, componentes, navegación); búsqueda global; infraestructura de notificaciones y auditoría.
*Desbloquea: todo lo demás.*

**Fase 1 — Núcleo comercial** *(tamaño: grande)* → retira Operaciones, Pricer e Inventario
Clientes v1 (ficha, captura manual, fuentes); Inventario completo (SKUs, fotos, certificados, consignación, ubicaciones, alertas); Cotizador (feed de metales + reglas de margen + constructor + PDF); Pedidos completos (plan de pagos, candado de anticipo, reserva de inventario, semáforos); Tareas v1 (manuales + vinculadas); Dashboard v1.
**Migración:** históricos de las tres Sheets (catálogo de diseños, inventario A1–A27 y piedras, pipeline y ventas históricas). Guion de migración: exportar → transformar → cargar → verificación cruzada contra las Sheets antes de retirarlas.
*Desbloquea: operar el negocio completo desde el ERP, aunque los mensajes sigan en el WhatsApp normal.*

**Fase 2 — Dinero** *(tamaño: mediano)* → retira Contabilidad
Ledger completo con asientos automáticos desde pedidos e inventario; P&L mensual; capital de trabajo en vivo; Proveedores + CxP; Gastos recurrentes; Comisiones; proyección de flujo; reporte al socio. Migración del histórico de Contabilidad v1.
*Desbloquea: las cuatro Sheets quedan retiradas; visibilidad financiera que nunca existió.*

**Fase 3 — Riel de WhatsApp** *(tamaño: mediano-grande)*
Setup de WhatsApp Business Cloud API (verificación de Meta Business + decisión de número); inbox unificado dentro del CRM; bot v2 sobre el riel oficial (calificación + reserva de citas real); módulo Citas completo con confirmaciones y recordatorios; plantillas aprobadas; notificaciones internas push.
*Desbloquea: cada conversación queda registrada; el funnel inquiry→visita se mide solo.*

**Fase 4 — Producción y documentos** *(tamaño: mediano)*
Kanban de producción completo (etapas, fotos, QC, costos, atascos); Biblioteca de media; Documentos (contrato y nota autogenerados, e-firma vía link, archivo automático, plantillas editables).
*Desbloquea: Fer opera 100 % desde el ERP; cero Word manual.*

**Fase 5 — Inteligencia** *(tamaño: mediano)*
Capa IA sobre el CRM: respuestas automáticas de rutina + cola de aprobación para lo sensible; motor de lifecycle completo (post-visita, avances, cumpleaños, aniversarios); tareas sugeridas por IA; **Asistente interno del ERP (§3.19)** — chat con herramientas para operar y consultar el sistema en lenguaje natural (v1: consultas + altas simples con confirmación en lo sensible).
*Requiere: Fase 3 operando y con historial de conversaciones para calibrar tono.*
*Desbloquea: la experiencia de cliente deliberada y automatizada que es la visión central.*

**Fase 6 — Crecimiento** *(tamaño: mediano)*
Marketing (funnel consolidado + gasto de Meta + CAC por zona); Expos (importar el Excel de investigación + captura en vivo); Postventa completa; programa de referidos; Base de conocimiento; Dashboard v2 con todo integrado.
*Desbloquea: decisiones de inversión en canales con números reales.*

**Reglas del proceso de construcción:**
- Cada fase se prueba con datos reales antes de pasar a la siguiente; Santiago valida visualmente (su patrón de iteración habitual).
- Las Sheets no se retiran hasta que la verificación cruzada de la migración cuadre al peso.
- Este documento se convierte en el `CLAUDE.md` del repositorio: Claude Code lo lee como contexto permanente y cada sesión de desarrollo referencia la sección del módulo en turno.

---

## 7. Decisiones pendientes y riesgos

1. **Número de WhatsApp.** Migrar el número actual a la Cloud API implica que deja de funcionar en la app normal de WhatsApp Business (todo se opera desde el ERP). Alternativa: número nuevo para el sistema y transición gradual. Decidir antes de Fase 3.
2. **Verificación de Meta Business.** Requisito para la Cloud API y para plantillas; iniciar el trámite temprano porque puede tardar.
3. **Proveedor de e-firma.** Firma simple con evidencia (trazo + timestamp + teléfono) es suficiente para contratos comerciales de este tipo y se puede construir dentro del ERP; firma certificada NOM-151 (proveedor externo, con costo) solo si el abogado lo pide. Validar con el abogado.
4. **API de precios de metales.** Elegir proveedor (MetalpriceAPI, GoldAPI o similar) — costo bajo, decisión de Fase 1.
5. **Acceso a Meta Marketing API** para importar gasto automáticamente; fallback: carga manual mensual de CSV (10 minutos/mes).
6. **Plantillas de WhatsApp:** Meta aprueba cada plantilla proactiva; redactarlas en tono Aurelle y enviarlas a aprobación en lote al inicio de Fase 3.
7. **Respaldo:** export automático semanal de la base a archivo descargable (los datos son el negocio).
8. **Costo de infraestructura estimado:** Vercel Pro + Supabase Pro + API de metales + Anthropic API ≈ $60–120 USD/mes al inicio. Trivial contra la renta de Ellion.

---

---

## 8. Ecosistema de documentación para desarrollo con Claude Code

Objetivo: que cualquier sesión nueva de Claude Code sea productiva en menos de un minuto, sin re-leer el proyecto entero ni re-tomar decisiones ya tomadas. El mecanismo: archivos cortos con roles estrictos y un protocolo obligatorio de inicio/cierre de sesión que los propios agentes ejecutan (está escrito en CLAUDE.md, que Claude Code lee automáticamente en cada sesión).

**Los archivos y sus roles:**

| Archivo | Rol | Régimen de escritura | Costo de lectura |
|---|---|---|---|
| `CLAUDE.md` (raíz del repo) | Constitución: qué es el proyecto, reglas duras, protocolo de sesión | Casi nunca cambia | Automático cada sesión (por eso es ~1 página) |
| `docs/PLAN_MAESTRO.md` | Este documento: QUÉ construir | Solo cuando Santiago cambia alcance | Solo la sección de la tarea en turno |
| `docs/ESTADO.md` | Bastón de relevo: dónde vamos, tarea siguiente exacta, bloqueos | Se SOBREESCRIBE cada sesión, máx. 1 página | Siempre al inicio |
| `docs/DECISIONES.md` | Log de decisiones técnicas, una línea cada una | Append-only | Búsqueda puntual, nunca lectura completa |
| `docs/CONVENCIONES.md` | CÓMO se escribe código aquí (nombres, patrones, RLS, eventos) | Se llena en Fase 0, luego rara vez | Primera sesión de cada agente; consulta puntual después |
| `docs/modulos/<modulo>.md` | Qué se construyó REALMENTE por módulo (tablas, rutas, trampas) | Al construir/modificar ese módulo | Solo al tocar ese módulo |

**El protocolo (escrito dentro de CLAUDE.md, autoejecutado por cada agente):**

- *Inicio de sesión:* leer ESTADO.md → leer solo la sección del plan que ESTADO indica → leer el doc del módulo si se va a tocar uno existente → buscar en DECISIONES antes de decidir.
- *Cierre de sesión:* actualizar ESTADO.md (sobreescribir), registrar decisiones nuevas (una línea), actualizar el doc del módulo tocado, agregar patrones nuevos a CONVENCIONES.

**Por qué esto ahorra tokens:** la separación estable/volátil hace que lo que se lee siempre (CLAUDE.md + ESTADO.md) sean ~2 páginas, y todo lo demás se lee bajo demanda y por sección. La regla de sobreescribir ESTADO.md evita el anti-patrón clásico de un log infinito que cada sesión paga por leer. El log de decisiones evita iteraciones circulares (el desperdicio más caro). CONVENCIONES evita que dos agentes construyan el mismo patrón de dos formas y una tercera sesión gaste tokens reconciliándolas.

**Reglas de higiene del ecosistema:**
1. Un solo frente de trabajo a la vez por área — dos agentes simultáneos en módulos distintos está bien; dos en el mismo módulo, no.
2. Si un documento crece más allá de su presupuesto (ESTADO 1 pág., módulo 2 págs.), la sesión que lo nota lo poda: la historia vieja se borra, no se archiva.
3. Santiago no mantiene nada de esto a mano: su único trabajo es validar visualmente y decidir; los agentes mantienen la documentación como parte de cada entrega.
4. El kit inicial (CLAUDE.md, ESTADO.md pre-llenado para Fase 0, DECISIONES.md con las decisiones ya tomadas, CONVENCIONES.md esqueleto, plantilla de módulo) se copia a la raíz del repo en el primer commit de Fase 0.

---

*Fin del Plan Maestro v1. Siguiente paso: crear el repo, copiar el kit de documentación, y arrancar Fase 0 con Claude Code — la primera instrucción de Santiago puede ser simplemente: "lee CLAUDE.md y docs/ESTADO.md y empieza".*
