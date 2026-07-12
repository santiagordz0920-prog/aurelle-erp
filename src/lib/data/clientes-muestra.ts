import type { Cliente, NotaCliente } from "@/lib/clientes";

/*
  DATOS DE MUESTRA — solo modo local (sin Supabase). Sirven para desarrollar y
  ver la interfaz con contenido realista. En producción NUNCA se usan: el flag
  supabaseConfigurado() enruta a la base real, que arranca vacía y se llena a
  medida que el equipo captura clientes.
*/
const S = "00000000-0000-0000-0000-000000000001";

/* Fecha (YYYY-MM-DD) con el mes-día a `dias` de hoy y un año de nacimiento fijo,
   para que las "fechas importantes" de muestra siempre caigan en la ventana. */
function cumpleEnDias(dias: number, anioNacimiento: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${anioNacimiento}-${mm}-${dd}`;
}

/* Campos de contacto/interés (0037): defaults + overrides por id abajo, para no
   repetir null en cada registro. Teléfonos normalizados como en producción. */
type ClienteBase = Omit<
  Cliente,
  "correo" | "instagram" | "facebook" | "otro_contacto" | "contacto_preferido" | "interes"
>;

const EXTRA: Record<string, Partial<Cliente>> = {
  "10000000-0000-0000-0000-000000000001": {
    interes:
      "Anillo de compromiso, solitario ovalado 2.2ct en oro blanco; boda en noviembre, presupuesto flexible.",
    correo: "ana.lopez@gmail.com",
  },
  "10000000-0000-0000-0000-000000000003": {
    interes: "Argollas de boda a juego, estilo clásico; vio piezas en la expo.",
    instagram: "@carla.mdz",
    contacto_preferido: "instagram",
  },
};

const CLIENTES_BASE: ClienteBase[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    nombre: "Ana López",
    telefono: "+52 81 8111 1111",
    fecha_nacimiento: cumpleEnDias(3, 1995),
    fecha_boda: "2026-11-21",
    pareja_nombre: "Diego",
    fuente_canal: "ads",
    fuente_detalle: "Fase 1 · SPGG",
    referido_por_cliente_id: null,
    referido_por_externo: null,
    etiquetas: ["2ct+", "vip"],
    estado_pipeline: "cotizado",
    motivo_perdida: null,
    sucursal_id: S,
    created_at: "2026-06-28T18:00:00Z",
    updated_at: "2026-07-02T18:00:00Z",
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    nombre: "Beto Ruiz",
    telefono: "+52 81 8222 2222",
    fecha_nacimiento: null,
    fecha_boda: "2027-02-14",
    pareja_nombre: "Sofía",
    fuente_canal: "referido",
    fuente_detalle: "Ana López",
    referido_por_cliente_id: "10000000-0000-0000-0000-000000000001",
    referido_por_externo: null,
    etiquetas: [],
    estado_pipeline: "cita_agendada",
    motivo_perdida: null,
    sucursal_id: S,
    created_at: "2026-07-01T18:00:00Z",
    updated_at: "2026-07-03T18:00:00Z",
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    nombre: "Carla Mendoza",
    telefono: "+52 81 8333 3333",
    fecha_nacimiento: cumpleEnDias(11, 1992),
    fecha_boda: null,
    pareja_nombre: null,
    fuente_canal: "expo",
    fuente_detalle: "Expo Novias MTY",
    referido_por_cliente_id: null,
    referido_por_externo: null,
    etiquetas: ["expo"],
    estado_pipeline: "conversando",
    motivo_perdida: null,
    sucursal_id: S,
    created_at: "2026-07-04T18:00:00Z",
    updated_at: "2026-07-04T18:00:00Z",
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    nombre: "Daniela Torres",
    telefono: "+52 81 8444 4444",
    fecha_nacimiento: null,
    fecha_boda: null,
    pareja_nombre: null,
    fuente_canal: "organico",
    fuente_detalle: null,
    referido_por_cliente_id: null,
    referido_por_externo: null,
    etiquetas: [],
    estado_pipeline: "nuevo",
    motivo_perdida: null,
    sucursal_id: S,
    created_at: "2026-07-05T15:00:00Z",
    updated_at: "2026-07-05T15:00:00Z",
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    nombre: "Emilia Cavazos",
    telefono: "+52 81 8555 5555",
    fecha_nacimiento: "1990-12-20",
    fecha_boda: cumpleEnDias(22, 2023),
    pareja_nombre: "Marcelo",
    fuente_canal: "ads",
    fuente_detalle: "Fase 2 · San Jerónimo",
    referido_por_cliente_id: null,
    referido_por_externo: null,
    etiquetas: ["vip"],
    estado_pipeline: "cerrado",
    motivo_perdida: null,
    sucursal_id: S,
    created_at: "2026-05-10T18:00:00Z",
    updated_at: "2026-06-20T18:00:00Z",
  },
];

export const CLIENTES_MUESTRA: Cliente[] = CLIENTES_BASE.map((c) => ({
  ...c,
  telefono: c.telefono ? c.telefono.replace(/[^0-9+]/g, "") : null,
  correo: null,
  instagram: null,
  facebook: null,
  otro_contacto: null,
  contacto_preferido: c.telefono ? ("telefono" as const) : null,
  interes: null,
  ...EXTRA[c.id],
}));

export const NOTAS_MUESTRA: NotaCliente[] = [
  {
    id: "20000000-0000-0000-0000-000000000001",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    autor_id: null,
    autor_nombre: "Santiago",
    texto:
      "Busca solitario ovalado 2.2ct, oro blanco. Presupuesto flexible. Boda en noviembre, no hay prisa pero está muy interesada.",
    created_at: "2026-06-29T18:00:00Z",
  },
  {
    id: "20000000-0000-0000-0000-000000000002",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    autor_id: null,
    autor_nombre: "Fernanda",
    texto: "Se le envió cotización v1. Quedó de confirmar con Diego el fin.",
    created_at: "2026-07-02T18:00:00Z",
  },
];
