import type { Documento } from "@/lib/documentos";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const DOCUMENTOS_MUESTRA: Documento[] = [
  {
    id: "e3000000-0000-0000-0000-000000000001",
    pedido_id: "f2000000-0000-0000-0000-000000000001",
    pedido_cliente: "Ana López",
    tipo: "contrato",
    token: "tok-demo-p1",
    estado: "enviado",
    version: 1,
    firmado_por: null,
    firmado_at: null,
    evidencia: null,
    sucursal_id: S,
    created_at: "2026-07-05T18:00:00Z",
    updated_at: "2026-07-05T18:00:00Z",
  },
  {
    id: "e3000000-0000-0000-0000-000000000002",
    pedido_id: "f2000000-0000-0000-0000-000000000002",
    pedido_cliente: "Carla Mendoza",
    tipo: "contrato",
    token: "tok-demo-p2",
    estado: "firmado",
    version: 1,
    firmado_por: "Carla Mendoza",
    firmado_at: "2026-07-06T21:30:00Z",
    evidencia: {
      user_agent: "Mozilla/5.0 (iPhone)",
      firmado_desde: null,
      at: "2026-07-06T21:30:00Z",
      firma_trazo: null,
    },
    sucursal_id: S,
    created_at: "2026-07-06T20:00:00Z",
    updated_at: "2026-07-06T21:30:00Z",
  },
];
