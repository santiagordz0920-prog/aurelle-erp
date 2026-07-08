import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/*
  Cliente de la API de Anthropic para la capa de IA (§capa de IA del plan). Se usa
  solo server-side (webhook, jobs). Requiere ANTHROPIC_API_KEY en Vercel.

  Modelo por defecto: Claude Opus 4.8 (`claude-opus-4-8`). Se puede cambiar con
  ANTHROPIC_MODEL (p. ej. `claude-haiku-4-5` para bajar costo si hace falta).
*/

export const MODELO_IA = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

/** ¿Está la IA configurada? (hay API key). */
export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cliente: Anthropic | null = null;

/** Cliente singleton de Anthropic. */
export function getAnthropic(): Anthropic {
  if (!cliente) cliente = new Anthropic();
  return cliente;
}
