import type { Pedido, Pago } from "@/lib/pedidos";

/* Datos de muestra — solo modo local (sin Supabase). NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const PEDIDOS_MUESTRA: Pedido[] = [
  {
    id: "f2000000-0000-0000-0000-000000000001",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    cotizacion_id: "f1000000-0000-0000-0000-000000000001",
    linea_negocio: "bridal",
    estado: "en_produccion",
    total: 148000,
    fecha_compromiso: "2026-07-12",
    override_candado: false,
    entregado_at: null,
    sucursal_id: S,
    created_at: "2026-07-04T18:00:00Z",
    updated_at: "2026-07-05T18:00:00Z",
    costo_real: 97000,
    margen_sellado: null,
    pagos: [
      {
        id: "pg-1",
        pedido_id: "f2000000-0000-0000-0000-000000000001",
        monto: 1000,
        fecha: "2026-07-04",
        metodo: "tarjeta",
        tipo: "anticipo_1",
        notas: "Gancho de conversión.",
        registrado_por: null,
        created_at: "2026-07-04T18:05:00Z",
      },
      {
        id: "pg-2",
        pedido_id: "f2000000-0000-0000-0000-000000000001",
        monto: 45000,
        fecha: "2026-07-05",
        metodo: "transferencia",
        tipo: "anticipo_2",
        notas: null,
        registrado_por: null,
        created_at: "2026-07-05T10:00:00Z",
      },
    ],
  },
  {
    id: "f2000000-0000-0000-0000-000000000002",
    cliente_id: "10000000-0000-0000-0000-000000000003",
    cliente_nombre: "Carla Mendoza",
    cotizacion_id: null,
    linea_negocio: "concierge",
    estado: "confirmado",
    total: 92000,
    fecha_compromiso: "2026-07-30",
    override_candado: false,
    entregado_at: null,
    sucursal_id: S,
    created_at: "2026-07-03T18:00:00Z",
    updated_at: "2026-07-03T18:00:00Z",
    costo_real: null,
    margen_sellado: null,
    pagos: [
      {
        id: "pg-3",
        pedido_id: "f2000000-0000-0000-0000-000000000002",
        monto: 1000,
        fecha: "2026-07-03",
        metodo: "efectivo",
        tipo: "anticipo_1",
        notas: null,
        registrado_por: null,
        created_at: "2026-07-03T18:10:00Z",
      },
    ],
  },
  {
    id: "f2000000-0000-0000-0000-000000000003",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    cotizacion_id: null,
    linea_negocio: "bridal",
    estado: "entregado",
    total: 60000,
    fecha_compromiso: "2026-06-28",
    override_candado: false,
    entregado_at: "2026-06-28T20:00:00Z",
    sucursal_id: S,
    created_at: "2026-06-10T18:00:00Z",
    updated_at: "2026-06-28T20:00:00Z",
    costo_real: 39000,
    margen_sellado: 35,
    pagos: [
      {
        id: "pg-4",
        pedido_id: "f2000000-0000-0000-0000-000000000003",
        monto: 60000,
        fecha: "2026-06-15",
        metodo: "transferencia",
        tipo: "liquidacion",
        notas: "Pago único.",
        registrado_por: null,
        created_at: "2026-06-15T12:00:00Z",
      },
    ],
  },
];

/** Suma de pagos de un pedido (helper de muestra). */
export function pagadoDe(p: Pedido): number {
  return (p.pagos ?? []).reduce((s, x: Pago) => s + x.monto, 0);
}
