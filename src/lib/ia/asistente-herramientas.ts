import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { clienteSchema, contactoCampos } from "@/lib/validaciones";
import { listarClientes, contarPorEstado, getCliente } from "@/lib/data/clientes";
import { citasDeHoy, listarCitas } from "@/lib/data/citas";
import { metricasMes, resumenFinanciero } from "@/lib/data/finanzas";
import { listarPedidos } from "@/lib/data/pedidos";
import { listarCotizaciones, getCotizacion } from "@/lib/data/cotizaciones";
import { ESTADO_COTIZACION } from "@/lib/cotizaciones";
import { crearTarea } from "@/app/(app)/hoy/tareas/actions";
import { agregarNota, cambiarEstado as cambiarEstadoCliente } from "@/app/(app)/clientes/actions";
import {
  agendarCita,
  reprogramarCita,
  cambiarEstadoCita,
} from "@/app/(app)/clientes/citas/actions";
import { registrarPago } from "@/app/(app)/ventas/pedidos/actions";
import { ESTADO_PIPELINE, PIPELINE_ORDEN } from "@/lib/clientes";
import type { MetodoContacto, EstadoPipeline } from "@/lib/clientes";
import { ESTADO_PEDIDO } from "@/lib/pedidos";
import { TIPO_CITA, SALA_CITA, ESTADO_CITA } from "@/lib/citas";
import { pesos } from "@/lib/inventario";
import { CLIENTES_MUESTRA } from "@/lib/data/clientes-muestra";

/*
  Catálogo de herramientas del ASISTENTE INTERNO del ERP (Plan Maestro §3.19).

  Cada herramienta es una acción que el ERP YA sabe hacer: consultar la capa de
  datos (`lib/data/*`) o ejecutar una Server Action existente
  (`crearTarea`, `agregarNota`, `agendarCita`). El asistente no abre caminos
  nuevos a la base: es otra "mano" que aprieta los mismos botones, por lo que:
   - corre con la SESIÓN DEL USUARIO (RLS manda: lo que el rol no ve, tampoco
     lo ve su asistente);
   - los triggers de auditoría y las reacciones de la matriz §4 se disparan
     igual que con captura manual.

  v1: consultas (sin confirmación) + altas simples y reversibles (cliente,
  tarea, nota, cita). Pagos y movimientos de Finanzas quedan para v2, SIEMPRE
  con confirmación previa (ver §3.19).
*/

export type Enlace = { href: string; etiqueta: string };
export type ResultadoHerramienta = { texto: string; enlace?: Enlace };

const dia = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Monterrey",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/* ── Definiciones que ve Claude (nombre + para qué + qué recibe) ─────────── */

export const HERRAMIENTAS: Anthropic.Tool[] = [
  {
    name: "buscar_cliente",
    description:
      "Busca clientes/leads por nombre, teléfono, correo o Instagram. Úsalo para encontrar el id de un cliente antes de agregarle una nota, agendarle una cita o consultar sus pedidos. Devuelve nombre, contacto, etapa del pipeline e id.",
    input_schema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Texto a buscar (nombre, teléfono, correo...)." },
      },
      required: ["q"],
    },
  },
  {
    name: "pipeline",
    description:
      "Conteo de clientes por etapa del pipeline (nuevo, conversando, cita agendada, visitó, cotizado, cerrado, perdido). Úsalo para '¿cómo va el pipeline?', '¿cuántos leads nuevos hay?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "agenda_de_hoy",
    description:
      "Las citas agendadas para hoy en el showroom, con cliente, hora, tipo, sala y estado. Úsalo para '¿qué citas hay hoy?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "ventas_del_mes",
    description:
      "Resumen financiero del mes en curso: ingresos (bridal/concierge), neto, avance de meta, ticket promedio y capital atrapado. Es información solo-admin: si el usuario no es admin, la base no devuelve cifras. Úsalo para '¿cuánto llevamos vendido este mes?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_pedido",
    description:
      "Lista pedidos con su total, lo pagado, el saldo y el estado. Sin filtro trae los más recientes; con 'cliente' filtra por nombre del cliente. Úsalo para '¿cuánto debe Rodrigo?', '¿qué saldo tiene el pedido de Ana?'.",
    input_schema: {
      type: "object",
      properties: {
        cliente: { type: "string", description: "Nombre del cliente para filtrar (opcional)." },
      },
    },
  },
  {
    name: "crear_cliente",
    description:
      "Da de alta un cliente/lead nuevo. Requiere nombre y al menos un dato de contacto (teléfono, correo o Instagram). Confirma con el usuario los datos si algo es ambiguo antes de crear.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" },
        telefono: { type: "string" },
        correo: { type: "string" },
        instagram: { type: "string" },
        fuente_canal: {
          type: "string",
          enum: ["ads", "expo", "referido", "organico"],
          description: "De dónde llegó el lead, si se sabe.",
        },
        fuente_detalle: { type: "string", description: "Campaña, expo o quién lo refirió." },
      },
      required: ["nombre"],
    },
  },
  {
    name: "crear_tarea",
    description:
      "Crea una tarea. Requiere un título. Puedes ligarla a un cliente (entidad_tipo='cliente' + entidad_id del cliente) y ponerle prioridad y fecha de vencimiento (YYYY-MM-DD).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        detalle: { type: "string" },
        prioridad: { type: "string", enum: ["baja", "media", "alta"] },
        fecha_vencimiento: { type: "string", description: "YYYY-MM-DD (opcional)." },
        cliente_id: { type: "string", description: "Id del cliente a ligar (opcional)." },
      },
      required: ["titulo"],
    },
  },
  {
    name: "agregar_nota",
    description:
      "Agrega una nota interna a la ficha de un cliente. Necesitas el id del cliente (búscalo antes con buscar_cliente).",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string" },
        texto: { type: "string" },
      },
      required: ["cliente_id", "texto"],
    },
  },
  {
    name: "agendar_cita",
    description:
      "Agenda una cita en el showroom para un cliente. Necesitas el id del cliente, el tipo, la sala y la fecha/hora. Valida choques de horario en la misma sala (si la sala está ocupada, avisa y pide otro horario). El horario va en hora local de Monterrey.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string" },
        tipo: {
          type: "string",
          enum: [
            "primera_visita",
            "seguimiento",
            "cierre",
            "entrega",
            "postventa",
            "noche_privada",
          ],
        },
        sala: { type: "string", enum: ["piso_ventas", "closing_room"] },
        cuando: {
          type: "string",
          description: "Fecha y hora local: 'YYYY-MM-DDTHH:mm' (p. ej. 2026-07-18T17:00).",
        },
        notas: { type: "string" },
      },
      required: ["cliente_id", "tipo", "sala", "cuando"],
    },
  },
  {
    name: "citas_de_cliente",
    description:
      "Lista las citas de un cliente (con su id, fecha, tipo, sala y estado). Úsalo para encontrar el id de una cita antes de reprogramarla o cancelarla.",
    input_schema: {
      type: "object",
      properties: { cliente_id: { type: "string" } },
      required: ["cliente_id"],
    },
  },
  {
    name: "buscar_cotizacion",
    description:
      "Lista cotizaciones con su id, cliente, total, estado y si ya se volvió pedido. Sin filtro trae las más recientes; con 'cliente' filtra por nombre. Úsalo para encontrar la cotización a convertir en pedido.",
    input_schema: {
      type: "object",
      properties: { cliente: { type: "string", description: "Nombre del cliente (opcional)." } },
    },
  },
  // ── Herramientas SENSIBLES (piden confirmación antes de ejecutar, §3.19 v2) ──
  {
    name: "registrar_pago",
    description:
      "Registra un pago a un pedido (dinero: SIEMPRE se confirma antes de ejecutar). Necesitas el id del pedido (búscalo con buscar_pedido), el monto, el método y el tipo de pago. Al registrarse, Finanzas asienta el ingreso automáticamente.",
    input_schema: {
      type: "object",
      properties: {
        pedido_id: { type: "string" },
        monto: { type: "number" },
        metodo: { type: "string", enum: ["efectivo", "transferencia", "tarjeta", "otro"] },
        tipo: {
          type: "string",
          enum: ["anticipo_1", "anticipo_2", "parcialidad", "liquidacion"],
          description:
            "anticipo_1 = primer anticipo; anticipo_2 = anticipo del 30% que desbloquea producción; parcialidad = abono; liquidacion = saldo final.",
        },
        notas: { type: "string" },
      },
      required: ["pedido_id", "monto", "metodo", "tipo"],
    },
  },
  {
    name: "cambiar_contacto",
    description:
      "Cambia uno o más datos de contacto de un cliente (teléfono, correo o Instagram). Se confirma antes de ejecutar. Solo toca los campos que indiques; los demás quedan igual. Necesitas el id del cliente.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string" },
        telefono: { type: "string" },
        correo: { type: "string" },
        instagram: { type: "string" },
      },
      required: ["cliente_id"],
    },
  },
  {
    name: "cambiar_etapa_pipeline",
    description:
      "Mueve a un cliente a otra etapa del pipeline. Se confirma antes de ejecutar. Necesitas el id del cliente y la etapa destino. Si es 'perdido', puedes dar un motivo.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string" },
        estado: {
          type: "string",
          enum: [
            "nuevo",
            "conversando",
            "cita_agendada",
            "visito",
            "cotizado",
            "cerrado",
            "perdido",
          ],
        },
        motivo: { type: "string", description: "Motivo de pérdida (solo si estado='perdido')." },
      },
      required: ["cliente_id", "estado"],
    },
  },
  {
    name: "reprogramar_cita",
    description:
      "Cambia la fecha/hora de una cita existente (misma sala y duración). Se confirma antes de ejecutar. Valida choques de horario. Necesitas el id de la cita (búscalo con citas_de_cliente) y la nueva fecha/hora local de Monterrey ('YYYY-MM-DDTHH:mm').",
    input_schema: {
      type: "object",
      properties: {
        cita_id: { type: "string" },
        cuando: { type: "string", description: "Nueva fecha y hora local: 'YYYY-MM-DDTHH:mm'." },
      },
      required: ["cita_id", "cuando"],
    },
  },
  {
    name: "cancelar_cita",
    description:
      "Cancela una cita. Se confirma antes de ejecutar. Necesitas el id de la cita (búscalo con citas_de_cliente).",
    input_schema: {
      type: "object",
      properties: { cita_id: { type: "string" } },
      required: ["cita_id"],
    },
  },
  {
    name: "convertir_cotizacion_en_pedido",
    description:
      "Convierte una cotización aceptada en un pedido. Se confirma antes de ejecutar. Necesitas el id de la cotización (búscalo con buscar_cotizacion). El pedido nace 'por confirmar'; el contrato se genera automáticamente cuando el pedido se confirma con el anticipo.",
    input_schema: {
      type: "object",
      properties: { cotizacion_id: { type: "string" } },
      required: ["cotizacion_id"],
    },
  },
];

/** Herramientas que MUTAN algo delicado: no se ejecutan sin confirmación. */
export const HERRAMIENTAS_SENSIBLES = new Set<string>([
  "registrar_pago",
  "cambiar_contacto",
  "cambiar_etapa_pipeline",
  "reprogramar_cita",
  "cancelar_cita",
  "convertir_cotizacion_en_pedido",
]);

/* ── Ejecutores: cada uno llama código de dominio existente ──────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Input = Record<string, any>;

const OK: ResultadoAccionLike = { ok: true };
type ResultadoAccionLike = { ok: boolean; error?: string };

/** Preferido efectivo (espeja `preferidoDefault` de clientes/actions). */
function preferidoDefault(d: {
  telefono?: string;
  correo?: string;
  instagram?: string;
}): MetodoContacto | null {
  if (d.telefono) return "telefono";
  if (d.correo) return "correo";
  if (d.instagram) return "instagram";
  return null;
}

async function crearClienteAsistente(input: Input): Promise<ResultadoHerramienta> {
  const parsed = clienteSchema.safeParse({
    nombre: input.nombre,
    telefono: input.telefono,
    correo: input.correo,
    instagram: input.instagram,
    fuente_canal: input.fuente_canal,
    fuente_detalle: input.fuente_detalle,
  });
  if (!parsed.success) {
    return { texto: `No se pudo crear: ${parsed.error.issues[0]?.message ?? "datos no válidos."}` };
  }
  const d = parsed.data;
  const usuario = await getUsuarioActual();

  /*
    Alta directa con la sesión del usuario (RLS + auditoría por trigger). Espeja
    `crearCliente` de clientes/actions.ts, que no se puede llamar aquí porque
    redirige a la ficha (rompería el loop de herramientas).
  */
  if (!supabaseConfigurado()) {
    const nuevoId = `10000000-0000-0000-0000-0000000009${(CLIENTES_MUESTRA.length + 10)
      .toString()
      .slice(-2)}`;
    CLIENTES_MUESTRA.unshift({
      id: nuevoId,
      nombre: d.nombre,
      telefono: d.telefono ?? null,
      correo: d.correo ?? null,
      instagram: d.instagram ?? null,
      facebook: null,
      otro_contacto: null,
      contacto_preferido: preferidoDefault(d),
      interes: null,
      fecha_nacimiento: null,
      fecha_boda: null,
      pareja_nombre: null,
      fuente_canal: d.fuente_canal ?? null,
      fuente_detalle: d.fuente_detalle ?? null,
      referido_por_cliente_id: null,
      referido_por_externo: null,
      etiquetas: [],
      estado_pipeline: "nuevo",
      motivo_perdida: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return {
      texto: `Cliente creado: ${d.nombre}.`,
      enlace: { href: `/clientes/${nuevoId}`, etiqueta: `Abrir ficha de ${d.nombre}` },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cliente")
    .insert({
      nombre: d.nombre,
      telefono: d.telefono ?? null,
      correo: d.correo ?? null,
      instagram: d.instagram ?? null,
      contacto_preferido: preferidoDefault(d),
      fuente_canal: d.fuente_canal ?? null,
      fuente_detalle: d.fuente_detalle ?? null,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return { texto: dup ? "Ya existe un cliente con ese teléfono." : "No se pudo crear el cliente." };
  }
  await registrarAccionAsistente("crear_cliente", `Creó al cliente ${d.nombre}.`, {
    tipo: "cliente",
    id: data.id,
  });
  return {
    texto: `Cliente creado: ${d.nombre}.`,
    enlace: { href: `/clientes/${data.id}`, etiqueta: `Abrir ficha de ${d.nombre}` },
  };
}

/** Arma un FormData para reusar una Server Action existente tal cual. */
function form(campos: Record<string, string | undefined>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) if (v != null && v !== "") fd.set(k, v);
  return fd;
}

/*
  Bitácora "vía asistente" (§3.19 regla dura): toda acción que EJECUTA el
  asistente queda registrada con su resumen legible, con la sesión del usuario
  (usuario_id = auth.uid() por default). Es secundaria: si la tabla aún no
  existe (migración 0039 sin aplicar) o falla, la acción ya ocurrió y no la
  rompemos — se traga el error, igual que la ficha del bot.
*/
async function registrarAccionAsistente(
  accion: string,
  resumen: string,
  entidad?: { tipo?: string; id?: string },
): Promise<void> {
  if (!supabaseConfigurado()) return; // en local no hay a dónde escribir
  try {
    const supabase = await createClient();
    await supabase.from("asistente_accion").insert({
      accion,
      resumen,
      entidad_tipo: entidad?.tipo ?? null,
      entidad_id: entidad?.id ?? null,
    });
  } catch {
    // la bitácora es secundaria; no rompe la acción
  }
}

export async function ejecutarHerramienta(
  nombre: string,
  input: Input,
): Promise<ResultadoHerramienta> {
  switch (nombre) {
    case "buscar_cliente": {
      const clientes = (await listarClientes(String(input.q ?? ""))).slice(0, 8);
      if (clientes.length === 0) return { texto: "No encontré clientes con ese dato." };
      const lineas = clientes.map((c) => {
        const contacto = c.telefono ?? c.correo ?? c.instagram ?? "sin contacto";
        const etapa = ESTADO_PIPELINE[c.estado_pipeline]?.etiqueta ?? c.estado_pipeline;
        return `- ${c.nombre} · ${contacto} · ${etapa} · id=${c.id}`;
      });
      return { texto: `Clientes encontrados:\n${lineas.join("\n")}` };
    }

    case "pipeline": {
      const conteo = await contarPorEstado();
      const lineas = (Object.keys(conteo) as (keyof typeof conteo)[]).map(
        (k) => `- ${ESTADO_PIPELINE[k]?.etiqueta ?? k}: ${conteo[k]}`,
      );
      const total = Object.values(conteo).reduce((s, n) => s + n, 0);
      return { texto: `Pipeline (${total} clientes):\n${lineas.join("\n")}` };
    }

    case "agenda_de_hoy": {
      const citas = await citasDeHoy();
      if (citas.length === 0) return { texto: "No hay citas agendadas para hoy." };
      const lineas = citas.map((c) => {
        const est = ESTADO_CITA[c.estado]?.etiqueta ?? c.estado;
        return `- ${dia(c.inicio)} · ${c.cliente_nombre ?? "sin cliente"} · ${
          TIPO_CITA[c.tipo]?.etiqueta ?? c.tipo
        } · ${SALA_CITA[c.sala] ?? c.sala} · ${est} · id=${c.id}`;
      });
      return { texto: `Citas de hoy (${citas.length}):\n${lineas.join("\n")}` };
    }

    case "citas_de_cliente": {
      const citas = await listarCitas({ cliente_id: String(input.cliente_id ?? "") });
      if (citas.length === 0) return { texto: "Ese cliente no tiene citas." };
      const lineas = citas.map((c) => {
        const est = ESTADO_CITA[c.estado]?.etiqueta ?? c.estado;
        return `- ${dia(c.inicio)} · ${TIPO_CITA[c.tipo]?.etiqueta ?? c.tipo} · ${
          SALA_CITA[c.sala] ?? c.sala
        } · ${est} · id=${c.id}`;
      });
      return { texto: `Citas del cliente (${citas.length}):\n${lineas.join("\n")}` };
    }

    case "ventas_del_mes": {
      const [m, r] = await Promise.all([metricasMes(), resumenFinanciero()]);
      if (m.ingresoTotal === 0 && r.ingresosMes === 0) {
        return {
          texto:
            "No hay ingresos registrados este mes (o tu rol no tiene acceso a Finanzas: es información solo-admin).",
        };
      }
      return {
        texto: [
          `Ingresos del mes: ${pesos(m.ingresoTotal)} (${pesos(m.ingresoBridal)} bridal, ${pesos(
            m.ingresoConcierge,
          )} concierge).`,
          `Neto del mes: ${pesos(r.netoMes)}.`,
          `Avance de meta: ${m.avanceMeta}%. Ticket promedio: ${pesos(m.ticketPromedio)}.`,
          `Capital atrapado en pedidos activos: ${pesos(r.capitalAtrapado)}.`,
        ].join("\n"),
      };
    }

    case "buscar_pedido": {
      const cliente = input.cliente ? String(input.cliente).toLowerCase() : null;
      let pedidos = await listarPedidos();
      if (cliente) {
        pedidos = pedidos.filter((p) => (p.cliente_nombre ?? "").toLowerCase().includes(cliente));
      }
      pedidos = pedidos.slice(0, 10);
      if (pedidos.length === 0) {
        return { texto: cliente ? `No encontré pedidos de "${input.cliente}".` : "No hay pedidos." };
      }
      const lineas = pedidos.map((p) => {
        const est = ESTADO_PEDIDO[p.estado]?.etiqueta ?? p.estado;
        const saldo = p.saldo ?? p.total - (p.pagado ?? 0);
        return `- ${p.cliente_nombre ?? "sin cliente"} · total ${pesos(p.total)} · pagado ${pesos(
          p.pagado ?? 0,
        )} · saldo ${pesos(saldo)} · ${est} · id=${p.id}`;
      });
      return { texto: `Pedidos:\n${lineas.join("\n")}` };
    }

    case "buscar_cotizacion": {
      const cliente = input.cliente ? String(input.cliente).toLowerCase() : null;
      let cots = await listarCotizaciones();
      if (cliente)
        cots = cots.filter((c) => (c.cliente_nombre ?? "").toLowerCase().includes(cliente));
      cots = cots.slice(0, 10);
      if (cots.length === 0)
        return { texto: cliente ? `No encontré cotizaciones de "${input.cliente}".` : "No hay cotizaciones." };
      const lineas = cots.map((c) => {
        const est = ESTADO_COTIZACION[c.estado]?.etiqueta ?? c.estado;
        const ped = c.pedido_id ? " · YA es pedido" : "";
        return `- ${c.cliente_nombre ?? "sin cliente"} · ${pesos(c.total)} · ${est}${ped} · id=${c.id}`;
      });
      return { texto: `Cotizaciones:\n${lineas.join("\n")}` };
    }

    case "crear_cliente":
      return crearClienteAsistente(input);

    case "crear_tarea": {
      const r: ResultadoAccionLike =
        (await crearTarea(OK, form({
          titulo: input.titulo,
          detalle: input.detalle,
          prioridad: input.prioridad || "media",
          fecha_vencimiento: input.fecha_vencimiento,
          entidad_tipo: input.cliente_id ? "cliente" : undefined,
          entidad_id: input.cliente_id,
        }))) ?? OK;
      if (r.ok)
        await registrarAccionAsistente("crear_tarea", `Creó la tarea "${input.titulo}".`, {
          tipo: input.cliente_id ? "cliente" : undefined,
          id: input.cliente_id,
        });
      return r.ok
        ? { texto: `Tarea creada: "${input.titulo}".`, enlace: { href: "/hoy/tareas", etiqueta: "Ver tareas" } }
        : { texto: `No se pudo crear la tarea: ${r.error ?? "error."}` };
    }

    case "agregar_nota": {
      const r = await agregarNota(OK, form({ cliente_id: input.cliente_id, texto: input.texto }));
      if (r.ok)
        await registrarAccionAsistente("agregar_nota", "Agregó una nota a la ficha del cliente.", {
          tipo: "cliente",
          id: String(input.cliente_id),
        });
      return r.ok
        ? {
            texto: "Nota agregada a la ficha del cliente.",
            enlace: { href: `/clientes/${input.cliente_id}`, etiqueta: "Abrir ficha" },
          }
        : { texto: `No se pudo agregar la nota: ${r.error ?? "error."}` };
    }

    case "agendar_cita": {
      const r = await agendarCita(
        OK,
        form({
          cliente_id: input.cliente_id,
          tipo: input.tipo,
          sala: input.sala,
          cuando: input.cuando,
          notas: input.notas,
        }),
      );
      const etiqueta = TIPO_CITA[input.tipo as keyof typeof TIPO_CITA]?.etiqueta ?? input.tipo;
      if (r.ok)
        await registrarAccionAsistente("agendar_cita", `Agendó una cita (${etiqueta}).`, {
          tipo: "cliente",
          id: String(input.cliente_id),
        });
      return r.ok
        ? {
            texto: `Cita agendada (${etiqueta}).`,
            enlace: { href: "/clientes/citas", etiqueta: "Ver agenda" },
          }
        : { texto: `No se pudo agendar: ${r.error ?? "error."}` };
    }

    default:
      return { texto: `Herramienta desconocida: ${nombre}.` };
  }
}

/* ── Acciones sensibles: preparar (sin mutar) → confirmar (ejecutar) ─────────
   Las herramientas que mueven dinero o editan/cancelan registros NO se ejecutan
   en el loop del modelo. Primero se PREPARAN (se validan y se arma un resumen
   legible) y se le muestra al usuario un botón de confirmar; solo con el "sí"
   se EJECUTA, de forma determinista (sin volver a pasar por el modelo). Así el
   humano es el gatillo real, no la disciplina del prompt (§3.19 v2). */

export type AccionPendiente = {
  herramienta: string;
  args: Record<string, unknown>;
  resumen: string; // lo que verá el usuario en la tarjeta de confirmación
};

const TIPO_PAGO: Record<string, string> = {
  anticipo_1: "Anticipo 1",
  anticipo_2: "Anticipo 2 (30%)",
  parcialidad: "Parcialidad",
  liquidacion: "Liquidación",
};

/** Cita por id (para resúmenes y validación de reprogramar/cancelar). */
async function getCitaBasica(
  id: string,
): Promise<{ inicio: string; cliente_nombre: string | null; estado: string } | null> {
  const c = (await listarCitas({})).find((x) => x.id === id);
  return c ? { inicio: c.inicio, cliente_nombre: c.cliente_nombre ?? null, estado: c.estado } : null;
}

/** Formatea 'YYYY-MM-DDTHH:mm' (local Monterrey) para el resumen. */
const cuandoLegible = (cuando: string) => dia(`${cuando}:00-06:00`);

export async function prepararAccionSensible(
  nombre: string,
  input: Input,
): Promise<{ pendiente?: AccionPendiente; error?: string }> {
  switch (nombre) {
    case "registrar_pago": {
      const monto = Number(input.monto);
      if (!(monto > 0)) return { error: "El monto debe ser mayor a cero." };
      if (!["efectivo", "transferencia", "tarjeta", "otro"].includes(input.metodo))
        return { error: "Método de pago no válido." };
      if (!["anticipo_1", "anticipo_2", "parcialidad", "liquidacion"].includes(input.tipo))
        return { error: "Tipo de pago no válido." };
      const p = (await listarPedidos()).find((x) => x.id === input.pedido_id);
      if (!p) return { error: "No encontré ese pedido." };
      const saldo = p.saldo ?? p.total - (p.pagado ?? 0);
      return {
        pendiente: {
          herramienta: "registrar_pago",
          args: {
            pedido_id: p.id,
            monto,
            metodo: input.metodo,
            tipo: input.tipo,
            notas: input.notas ?? null,
          },
          resumen: `Registrar ${TIPO_PAGO[input.tipo]} de ${pesos(monto)} (${input.metodo}) al pedido de ${
            p.cliente_nombre ?? "cliente"
          }. Saldo actual ${pesos(saldo)} → quedaría ${pesos(saldo - monto)}.`,
        },
      };
    }

    case "cambiar_contacto": {
      const cid = String(input.cliente_id ?? "");
      const cambios: Record<string, string> = {};
      const etiquetas: string[] = [];
      if (input.telefono != null && input.telefono !== "") {
        const t = contactoCampos.telefono.safeParse(String(input.telefono));
        if (!t.success) return { error: t.error.issues[0]?.message ?? "Teléfono no válido." };
        cambios.telefono = t.data as string;
        etiquetas.push(`teléfono → ${cambios.telefono}`);
      }
      if (input.correo != null && input.correo !== "") {
        const c = contactoCampos.correo.safeParse(String(input.correo));
        if (!c.success) return { error: c.error.issues[0]?.message ?? "Correo no válido." };
        cambios.correo = c.data as string;
        etiquetas.push(`correo → ${cambios.correo}`);
      }
      if (input.instagram != null && input.instagram !== "") {
        cambios.instagram = String(input.instagram).trim();
        etiquetas.push(`Instagram → ${cambios.instagram}`);
      }
      if (Object.keys(cambios).length === 0)
        return { error: "Dime qué dato de contacto cambiar (teléfono, correo o Instagram)." };
      const cli = await getCliente(cid);
      if (!cli) return { error: "No encontré ese cliente." };
      return {
        pendiente: {
          herramienta: "cambiar_contacto",
          args: { cliente_id: cid, cambios },
          resumen: `Actualizar contacto de ${cli.nombre}: ${etiquetas.join(", ")}.`,
        },
      };
    }

    case "cambiar_etapa_pipeline": {
      const cid = String(input.cliente_id ?? "");
      const estado = String(input.estado ?? "") as EstadoPipeline;
      if (!PIPELINE_ORDEN.includes(estado) && estado !== "perdido")
        return { error: "Etapa de pipeline no válida." };
      const cli = await getCliente(cid);
      if (!cli) return { error: "No encontré ese cliente." };
      const actual = ESTADO_PIPELINE[cli.estado_pipeline]?.etiqueta ?? cli.estado_pipeline;
      const destino = ESTADO_PIPELINE[estado]?.etiqueta ?? estado;
      return {
        pendiente: {
          herramienta: "cambiar_etapa_pipeline",
          args: { cliente_id: cid, estado, motivo: input.motivo ?? null },
          resumen: `Mover a ${cli.nombre} de "${actual}" a "${destino}"${
            estado === "perdido" && input.motivo ? ` (motivo: ${input.motivo})` : ""
          }.`,
        },
      };
    }

    case "reprogramar_cita": {
      const cuando = String(input.cuando ?? "");
      if (cuando.length < 10) return { error: "Dame la nueva fecha y hora (YYYY-MM-DDTHH:mm)." };
      const cita = await getCitaBasica(String(input.cita_id ?? ""));
      if (!cita) return { error: "No encontré esa cita." };
      if (cita.estado === "cancelada")
        return { error: "Esa cita está cancelada; mejor agenda una nueva." };
      return {
        pendiente: {
          herramienta: "reprogramar_cita",
          args: { cita_id: input.cita_id, cuando },
          resumen: `Mover la cita de ${cita.cliente_nombre ?? "cliente"} del ${dia(
            cita.inicio,
          )} al ${cuandoLegible(cuando)}.`,
        },
      };
    }

    case "cancelar_cita": {
      const cita = await getCitaBasica(String(input.cita_id ?? ""));
      if (!cita) return { error: "No encontré esa cita." };
      if (cita.estado === "cancelada") return { error: "Esa cita ya está cancelada." };
      return {
        pendiente: {
          herramienta: "cancelar_cita",
          args: { cita_id: input.cita_id },
          resumen: `Cancelar la cita de ${cita.cliente_nombre ?? "cliente"} del ${dia(cita.inicio)}.`,
        },
      };
    }

    case "convertir_cotizacion_en_pedido": {
      const cot = await getCotizacion(String(input.cotizacion_id ?? ""));
      if (!cot) return { error: "No encontré esa cotización." };
      if (cot.pedido_id) return { error: "Esa cotización ya se convirtió en pedido." };
      if (!cot.cliente_id) return { error: "La cotización necesita un cliente para volverse pedido." };
      return {
        pendiente: {
          herramienta: "convertir_cotizacion_en_pedido",
          args: {
            cotizacion_id: cot.id,
            cliente_id: cot.cliente_id,
            cliente_nombre: cot.cliente_nombre ?? null,
            total: cot.total,
          },
          resumen: `Convertir la cotización de ${cot.cliente_nombre ?? "cliente"} (${pesos(
            cot.total,
          )}) en pedido. El contrato se genera al confirmar el pedido con el anticipo.`,
        },
      };
    }

    default:
      return { error: `Acción no reconocida: ${nombre}.` };
  }
}

/** Ejecuta una acción sensible YA CONFIRMADA por el usuario (re-valida al vuelo). */
export async function confirmarAccion(p: AccionPendiente): Promise<ResultadoHerramienta> {
  const a = p.args;
  switch (p.herramienta) {
    case "registrar_pago": {
      const r = await registrarPago(
        OK,
        form({
          pedido_id: String(a.pedido_id),
          monto: String(a.monto),
          metodo: String(a.metodo),
          tipo: String(a.tipo),
          notas: a.notas ? String(a.notas) : undefined,
        }),
      );
      if (r.ok)
        await registrarAccionAsistente("registrar_pago", p.resumen, {
          tipo: "pedido",
          id: String(a.pedido_id),
        });
      return r.ok
        ? {
            texto: `Pago registrado. Finanzas asentó el ingreso.`,
            enlace: { href: `/ventas/pedidos/${a.pedido_id}`, etiqueta: "Ver pedido" },
          }
        : { texto: `No se pudo registrar el pago: ${r.error ?? "error."}` };
    }

    case "cambiar_contacto": {
      const cid = String(a.cliente_id);
      const cambios = a.cambios as Record<string, string>;
      if (!supabaseConfigurado()) {
        const c = CLIENTES_MUESTRA.find((x) => x.id === cid);
        if (c) Object.assign(c, cambios);
      } else {
        const supabase = await createClient();
        const { error } = await supabase.from("cliente").update(cambios).eq("id", cid);
        if (error) {
          return {
            texto:
              error.code === "23505"
                ? "Ya existe otro cliente con ese teléfono."
                : "No se pudo actualizar el contacto.",
          };
        }
      }
      await registrarAccionAsistente("cambiar_contacto", p.resumen, { tipo: "cliente", id: cid });
      return {
        texto: "Contacto actualizado.",
        enlace: { href: `/clientes/${cid}`, etiqueta: "Abrir ficha" },
      };
    }

    case "cambiar_etapa_pipeline": {
      const r = await cambiarEstadoCliente(
        String(a.cliente_id),
        a.estado as EstadoPipeline,
        a.motivo ? String(a.motivo) : undefined,
      );
      if (r.ok)
        await registrarAccionAsistente("cambiar_etapa_pipeline", p.resumen, {
          tipo: "cliente",
          id: String(a.cliente_id),
        });
      return r.ok
        ? {
            texto: "Etapa actualizada.",
            enlace: { href: `/clientes/${a.cliente_id}`, etiqueta: "Abrir ficha" },
          }
        : { texto: `No se pudo cambiar la etapa: ${r.error ?? "error."}` };
    }

    case "reprogramar_cita": {
      const r = await reprogramarCita(String(a.cita_id), String(a.cuando));
      if (r.ok)
        await registrarAccionAsistente("reprogramar_cita", p.resumen, {
          tipo: "cita",
          id: String(a.cita_id),
        });
      return r.ok
        ? { texto: "Cita reprogramada.", enlace: { href: "/clientes/citas", etiqueta: "Ver agenda" } }
        : { texto: `No se pudo reprogramar: ${r.error ?? "error."}` };
    }

    case "cancelar_cita": {
      const r = await cambiarEstadoCita(String(a.cita_id), "cancelada");
      if (r.ok)
        await registrarAccionAsistente("cancelar_cita", p.resumen, {
          tipo: "cita",
          id: String(a.cita_id),
        });
      return r.ok
        ? { texto: "Cita cancelada.", enlace: { href: "/clientes/citas", etiqueta: "Ver agenda" } }
        : { texto: `No se pudo cancelar: ${r.error ?? "error."}` };
    }

    case "convertir_cotizacion_en_pedido": {
      const cotId = String(a.cotizacion_id);
      const clienteId = String(a.cliente_id);
      const total = Number(a.total) || 0;
      const usuario = await getUsuarioActual();
      let pedidoId: string;

      // Espeja `crearPedidoDesdeCotizacion` (que redirige y rompería el flujo):
      // crea el pedido 'por_confirmar' y liga la cotización. El contrato lo
      // genera la confirmación del pedido (crearContratoSiNoExiste), no aquí.
      if (!supabaseConfigurado()) {
        pedidoId = `f2000000-0000-0000-0000-0000000009${Date.now().toString().slice(-2)}`;
      } else {
        const supabase = await createClient();
        const { data: cot } = await supabase
          .from("cotizacion")
          .select("pedido_id")
          .eq("id", cotId)
          .maybeSingle();
        if (cot?.pedido_id)
          return {
            texto: "Esa cotización ya tenía un pedido.",
            enlace: { href: `/ventas/pedidos/${cot.pedido_id}`, etiqueta: "Ver pedido" },
          };
        const { data: nuevo, error } = await supabase
          .from("pedido")
          .insert({
            cliente_id: clienteId,
            cotizacion_id: cotId,
            linea_negocio: "bridal",
            total,
            sucursal_id: usuario.sucursalId,
          })
          .select("id")
          .single();
        if (error || !nuevo) return { texto: "No se pudo crear el pedido." };
        pedidoId = nuevo.id;
        await supabase.from("cotizacion").update({ pedido_id: pedidoId }).eq("id", cotId);
      }
      await registrarAccionAsistente("convertir_cotizacion_en_pedido", p.resumen, {
        tipo: "pedido",
        id: pedidoId,
      });
      return {
        texto: "Pedido creado desde la cotización (queda 'por confirmar'; el contrato se genera al confirmarlo con el anticipo).",
        enlace: { href: `/ventas/pedidos/${pedidoId}`, etiqueta: "Ver pedido" },
      };
    }

    default:
      return { texto: "Acción no reconocida." };
  }
}
