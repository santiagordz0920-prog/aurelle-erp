import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { clienteSchema } from "@/lib/validaciones";
import { listarClientes, contarPorEstado } from "@/lib/data/clientes";
import { citasDeHoy } from "@/lib/data/citas";
import { metricasMes, resumenFinanciero } from "@/lib/data/finanzas";
import { listarPedidos } from "@/lib/data/pedidos";
import { crearTarea } from "@/app/(app)/hoy/tareas/actions";
import { agregarNota } from "@/app/(app)/clientes/actions";
import { agendarCita } from "@/app/(app)/clientes/citas/actions";
import { ESTADO_PIPELINE } from "@/lib/clientes";
import type { MetodoContacto } from "@/lib/clientes";
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
];

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
        } · ${SALA_CITA[c.sala] ?? c.sala} · ${est}`;
      });
      return { texto: `Citas de hoy (${citas.length}):\n${lineas.join("\n")}` };
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
      return r.ok
        ? { texto: `Tarea creada: "${input.titulo}".`, enlace: { href: "/hoy/tareas", etiqueta: "Ver tareas" } }
        : { texto: `No se pudo crear la tarea: ${r.error ?? "error."}` };
    }

    case "agregar_nota": {
      const r = await agregarNota(OK, form({ cliente_id: input.cliente_id, texto: input.texto }));
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
      return r.ok
        ? {
            texto: `Cita agendada (${TIPO_CITA[input.tipo as keyof typeof TIPO_CITA]?.etiqueta ?? input.tipo}).`,
            enlace: { href: "/clientes/citas", etiqueta: "Ver agenda" },
          }
        : { texto: `No se pudo agendar: ${r.error ?? "error."}` };
    }

    default:
      return { texto: `Herramienta desconocida: ${nombre}.` };
  }
}
