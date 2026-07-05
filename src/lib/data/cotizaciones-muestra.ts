import type { Cotizacion, PrecioMetal } from "@/lib/cotizaciones";

const S = "00000000-0000-0000-0000-000000000001";

export const PRECIOS_METAL_MUESTRA: PrecioMetal[] = [
  { id: "p1", metal: "oro", pureza: "18k", precio_gramo_mxn: 1650, tipo_cambio_usd_mxn: 18.6, fecha: "2026-07-05", fuente: "manual" },
  { id: "p2", metal: "oro", pureza: "14k", precio_gramo_mxn: 1290, tipo_cambio_usd_mxn: 18.6, fecha: "2026-07-05", fuente: "manual" },
  { id: "p3", metal: "platino", pureza: "950", precio_gramo_mxn: 720, tipo_cambio_usd_mxn: 18.6, fecha: "2026-07-05", fuente: "manual" },
];

export const COTIZACIONES_MUESTRA: Cotizacion[] = [
  {
    id: "f1000000-0000-0000-0000-000000000001",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    estado: "enviada",
    total: 148000,
    notas: "Solitario ovalado, oro blanco 18k.",
    valida_hasta: "2026-07-20",
    pdf_url: null,
    pedido_id: null,
    sucursal_id: S,
    created_at: "2026-07-02T18:00:00Z",
    updated_at: "2026-07-02T18:00:00Z",
    costo_estimado: 97000,
    lineas: [
      { id: "l1", cotizacion_id: "f1000000-0000-0000-0000-000000000001", descripcion: "Diamante central ovalado 2.2ct F VS1", metal: "oro", quilataje: "18k", item_inventario_id: null, especificacion: null, precio: 110000, orden: 0 },
      { id: "l2", cotizacion_id: "f1000000-0000-0000-0000-000000000001", descripcion: "Montura solitario oro blanco", metal: "oro", quilataje: "18k", item_inventario_id: null, especificacion: null, precio: 38000, orden: 1 },
    ],
  },
  {
    id: "f1000000-0000-0000-0000-000000000002",
    cliente_id: "10000000-0000-0000-0000-000000000003",
    cliente_nombre: "Carla Mendoza",
    estado: "seguimiento",
    total: 92000,
    notas: null,
    valida_hasta: "2026-07-18",
    pdf_url: null,
    pedido_id: null,
    sucursal_id: S,
    created_at: "2026-07-03T18:00:00Z",
    updated_at: "2026-07-04T18:00:00Z",
    costo_estimado: 61000,
    lineas: [
      { id: "l3", cotizacion_id: "f1000000-0000-0000-0000-000000000002", descripcion: "Diamante redondo 1.0ct G VVS2", metal: "oro", quilataje: "14k", item_inventario_id: null, especificacion: null, precio: 70000, orden: 0 },
      { id: "l4", cotizacion_id: "f1000000-0000-0000-0000-000000000002", descripcion: "Montura pavé", metal: "oro", quilataje: "14k", item_inventario_id: null, especificacion: null, precio: 22000, orden: 1 },
    ],
  },
];
