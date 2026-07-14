# Módulo: Asistente interno del ERP (§3.19)

> Copiloto de Claude DENTRO del ERP para que Santiago y Fer lo operen con texto:
> consultar el negocio y dar de alta cosas en el módulo correcto en lenguaje
> natural. NO es el bot de WhatsApp (ese habla con clientes); este habla con el
> equipo y ejecuta acciones vía tool use.

## Estado
Construido 2026-07-14 (Fase 5). **v1** (consultas + altas simples), **v2**
(acciones con confirmación: pagos + ediciones) y **v2.1** (contexto de pantalla,
conversión cotización→pedido, bitácora "vía asistente") el mismo día. v1 y v2 ya
en el tronco (PRs #50, #51). Reusa la capa de datos y las Server Actions
existentes; v2 agregó `reprogramarCita` y **v2.1 la migración 0039**
(`asistente_accion`, bitácora). Requiere `ANTHROPIC_API_KEY` en Vercel (igual que
el bot). Si no hay key, el widget responde que no está configurado (no rompe nada).

## Piezas
- `src/lib/ia/asistente-herramientas.ts` — **catálogo de herramientas**. Cada una
  llama código de dominio que YA existe: consultas a `lib/data/*` o Server Actions
  (`crearTarea`, `agregarNota`, `agendarCita`). `ejecutarHerramienta(nombre, input)`
  despacha y devuelve `{ texto, enlace? }`. El asistente NO abre caminos nuevos a
  la base: es otra mano que aprieta los mismos botones.
- `src/lib/ia/asistente.ts` — `correrAsistente(historial)`: loop de tool use
  (Claude pide herramienta → se ejecuta → se le devuelve el resultado, hasta
  `MAX_RONDAS=6`) con la persona del copiloto interno + reglas duras. Corre con la
  sesión del usuario (`getUsuarioActual`) → RLS manda. Devuelve además `pendiente`
  (una acción sensible propuesta que espera confirmación).
- `src/app/api/asistente/route.ts` — POST que recibe el historial del chat y
  corre el loop. **Ruta protegida** (el middleware exige sesión; NO está en la
  lista de rutas públicas), así que el asistente ve exactamente lo que el usuario
  logueado puede ver. `maxDuration=60`. **También ejecuta las confirmaciones**: un
  body `{ confirmar: AccionPendiente }` corre la acción de forma determinista (sin
  volver a pasar por el modelo), re-validando por RLS.
- `src/components/asistente/asistente-flotante.tsx` — burbuja fija **abajo a la
  izquierda** en toda la app (el Inbox flotante vive a la derecha). Chat con
  historial en estado de cliente; manda todo a `/api/asistente`; renderiza los
  enlaces y, para una acción sensible, una **tarjeta Confirmar/Cancelar** con el
  resumen. Montado en `app-shell.tsx`.

## Herramientas
**v1 — sin confirmación:**
- Consultas: `buscar_cliente`, `pipeline`, `agenda_de_hoy`, `ventas_del_mes`
  (solo-admin por RLS), `buscar_pedido` (saldos), `citas_de_cliente`.
- Altas simples y reversibles: `crear_cliente`, `crear_tarea`, `agregar_nota`,
  `agendar_cita` (reusa el candado anti doble-reserva de la Server Action real).

**v2 — CON confirmación previa (dinero o edición de registros):** `registrar_pago`
(solo-admin por RLS; Finanzas asienta por trigger), `cambiar_contacto`,
`cambiar_etapa_pipeline`, `reprogramar_cita`, `cancelar_cita`.

**v2.1:** `buscar_cotizacion` (consulta) + `convertir_cotizacion_en_pedido` (con
confirmación; el pedido nace 'por_confirmar', el contrato se genera al confirmarlo
con el anticipo). Además: **contexto de pantalla** (el widget manda el `path`; si
el usuario está viendo un pedido/cliente/cotización/item, `contextoDePantalla` en
`asistente.ts` lo inyecta al prompt y "regístrale un pago" / "súbele una nota"
resuelven la entidad sin nombrarla) y **bitácora "vía asistente"**
(`registrarAccionAsistente` escribe en `asistente_accion` tras cada mutación
exitosa; corre con la sesión del usuario, RLS admin-read; migración 0039).

## El candado de confirmación (v2)
Las herramientas de `HERRAMIENTAS_SENSIBLES` NO se ejecutan en el loop del modelo.
`prepararAccionSensible(nombre, input)` valida y arma un `resumen` legible SIN mutar,
y el resultado se devuelve como `pendiente`. El widget muestra la tarjeta
Confirmar/Cancelar; solo con "Confirmar" el widget hace `POST { confirmar }` →
`confirmarAccion(pendiente)` ejecuta la Server Action real. **El humano es el gatillo,
no la disciplina del prompt.** Reglas: una sola propuesta a la vez; mandar un mensaje
nuevo descarta la propuesta sin confirmar; el modelo tiene instrucción de no afirmar
que algo quedó hecho hasta la confirmación.

## Eventos que emite / consume
- Emite: las mismas reacciones de la matriz §4 que dispararía la captura manual
  (los triggers de BD y las Server Actions corren igual sin importar quién los
  invoca). P. ej. `agendar_cita` crea la tarea de preparación como el formulario.
- Consume: nada nuevo; lee la capa de datos de todos los módulos según el rol.

## Lógica no obvia / trampas
- **Corre con la sesión del usuario, nunca `service_role`.** Las herramientas usan
  `createClient()` (cookies) / Server Actions, no `createAdminClient()`. Si se
  cambia esto se rompe el modelo de permisos (RLS) del asistente.
- `crear_cliente` hace un **insert directo** (con la sesión del usuario) en vez de
  llamar `crearCliente` de `clientes/actions.ts`, porque esa acción **redirige** a
  la ficha (`redirect()` lanzaría y rompería el loop). El insert espeja su forma;
  auditoría y RLS aplican por trigger/policy igual. Si algún día `crearCliente` se
  refactoriza para exponer un core sin redirect, cambiar la herramienta a llamarlo.
- Las demás altas (`crear_tarea`, `agregar_nota`, `agendar_cita`) SÍ llaman la
  Server Action tal cual (arman un `FormData`), porque devuelven `{ok,error}` sin
  redirigir.
- El widget manda solo `role`+`content` al backend (los `enlaces`/`pendiente` son de
  la UI y el flujo de confirmación, no historial del modelo). Se oculta en el hilo
  del Inbox (`/clientes/inbox/*`) para no estorbar, igual que el Inbox flotante.
- **`cambiar_contacto` hace update PARCIAL directo** (solo los campos indicados), NO
  llama `actualizarContacto` de `clientes/actions.ts` porque esa acción REESCRIBE
  todos los campos de contacto (pondría en null los que no mandes → borraría datos).
  Normaliza teléfono/correo con `contactoCampos` de `validaciones.ts`.
- La confirmación re-valida por RLS en el servidor: aunque el `pendiente` viaje al
  cliente y vuelva, `registrar_pago` sigue siendo solo-admin (lo impone la BD).

## Pendientes conocidos de este módulo (ver Plan Maestro §3.19)
- **Auditoría "vía asistente" — RESUELTA en v2.1 con bitácora propia** (`asistente_accion`,
  0039), NO tagueando el trigger genérico: marcar el canal exigiría fijar un GUC de
  Postgres en la MISMA transacción del cambio, cosa que supabase-js no permite limpio
  (cada `.insert/.update` es su propia transacción). La bitácora guarda el resumen
  humano por acción, con la sesión del usuario. Si algún día se quiere el canal en la
  tabla `auditoria` misma, haría falta ese mecanismo transaccional (RPC por acción).
- Borrados desde el chat (clientes/pedidos): deliberadamente NO se hacen (regla dura §3.19).
- **Persona/tono editable sin tocar código** (hoy el prompt vive en `asistente.ts`):
  único pendiente funcional; necesita una pantalla en `/sistema` para el addendum del
  prompt (patrón de `/sistema/contrato`). No bloquea nada.
- Verificación real del loop de tool use (modelo decidiendo) = en prod con
  `ANTHROPIC_API_KEY` (el sandbox no alcanza la API). Validado local con build+lint,
  la cadena de migraciones 0001–0039 en Postgres (0039 aplica; RLS de la bitácora
  probada: insert pone `usuario_id=auth.uid()`, el `with_check` bloquea escribir a
  nombre de otro), y smoke de todos los ejecutores + preparar→confirmar de las 6
  acciones sensibles + parser de contexto contra datos de muestra. Nota: en muestra
  los ids no son UUID v4, así que `registrar_pago` (pagoSchema `.uuid()`) falla SOLO
  en local; en prod los ids son v4 válidos.
