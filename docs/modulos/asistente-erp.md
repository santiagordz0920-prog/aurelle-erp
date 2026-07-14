# Módulo: Asistente interno del ERP (§3.19)

> Copiloto de Claude DENTRO del ERP para que Santiago y Fer lo operen con texto:
> consultar el negocio y dar de alta cosas en el módulo correcto en lenguaje
> natural. NO es el bot de WhatsApp (ese habla con clientes); este habla con el
> equipo y ejecuta acciones vía tool use.

## Estado
Construido 2026-07-14 (Fase 5, v1). Sin migración: reusa la capa de datos y las
Server Actions existentes. Requiere `ANTHROPIC_API_KEY` en Vercel (igual que el
bot). Si no hay key, el widget responde que no está configurado (no rompe nada).

## Piezas
- `src/lib/ia/asistente-herramientas.ts` — **catálogo de herramientas**. Cada una
  llama código de dominio que YA existe: consultas a `lib/data/*` o Server Actions
  (`crearTarea`, `agregarNota`, `agendarCita`). `ejecutarHerramienta(nombre, input)`
  despacha y devuelve `{ texto, enlace? }`. El asistente NO abre caminos nuevos a
  la base: es otra mano que aprieta los mismos botones.
- `src/lib/ia/asistente.ts` — `correrAsistente(historial)`: loop de tool use
  (Claude pide herramienta → se ejecuta → se le devuelve el resultado, hasta
  `MAX_RONDAS=6`) con la persona del copiloto interno + reglas duras. Corre con la
  sesión del usuario (`getUsuarioActual`) → RLS manda.
- `src/app/api/asistente/route.ts` — POST que recibe el historial del chat y
  corre el loop. **Ruta protegida** (el middleware exige sesión; NO está en la
  lista de rutas públicas), así que el asistente ve exactamente lo que el usuario
  logueado puede ver. `maxDuration=60` (el tool use encadena varias llamadas).
- `src/components/asistente/asistente-flotante.tsx` — burbuja fija **abajo a la
  izquierda** en toda la app (el Inbox flotante vive a la derecha). Chat con
  historial en estado de cliente; manda todo a `/api/asistente`; renderiza los
  enlaces que devuelven las acciones. Montado en `app-shell.tsx`.

## Herramientas (v1)
Consultas (sin confirmación): `buscar_cliente`, `pipeline`, `agenda_de_hoy`,
`ventas_del_mes` (solo-admin por RLS), `buscar_pedido` (saldos).
Altas simples y reversibles: `crear_cliente`, `crear_tarea`, `agregar_nota`,
`agendar_cita` (reusa el candado anti doble-reserva de la Server Action real).

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
- El widget manda solo `role`+`content` al backend (los `enlaces` son de la UI, no
  del modelo). Se ocultan en el hilo del Inbox (`/clientes/inbox/*`) para no
  estorbar, igual que el Inbox flotante.

## Pendientes conocidos de este módulo (v2, ver Plan Maestro §3.19)
- **Confirmación previa** para acciones con dinero o difíciles de deshacer
  (registrar pago, mover Finanzas): mostrar "voy a hacer X, ¿confirmas?" y ejecutar
  solo con el sí. En v1 no hay tools de dinero, así que aún no hace falta el gate.
- Acciones encadenadas (convertir cotización→pedido + contrato), ediciones
  ("cámbiale el teléfono", "mueve la cita"), y borrados — hoy no se editan/borran
  registros existentes desde el chat.
- Contexto de pantalla (si estás viendo un pedido, "súbele una nota" entiende cuál).
- Marcar en la auditoría explícitamente "vía asistente" (hoy la auditoría registra
  el usuario que ejecutó; falta la etiqueta de canal).
- Persona/tono editable sin tocar código (el prompt vive en `asistente.ts`).
- Verificación real del loop de tool use = en prod con `ANTHROPIC_API_KEY` (el
  sandbox no alcanza la API); v1 validado con build+lint+smoke de los ejecutores
  contra datos de muestra (las 7 herramientas devuelven lo esperado).
