# Guía: conectar WhatsApp al ERP (para Santiago)

> Objetivo: que los mensajes de los clientes lleguen al ERP y las respuestas
> salgan por el número oficial, con el bot de IA ayudando. Esto es un trámite en
> el panel de Meta + pegar 4–5 datos en Vercel. Una sola vez.

## Importante antes de empezar (léelo)
- **El número que ya usas en la app de WhatsApp Business (la del celular) NO puede
  estar al mismo tiempo en la Cloud API.** Tienes dos opciones:
  1. **Usar un número NUEVO** solo para el ERP (recomendado para no perder tus chats
     actuales del celular), o
  2. **Migrar** tu número actual a la Cloud API (dejarías de usar la app del celular
     con ese número; los chats viejos del teléfono no se traen).
- Necesitas una tarjeta para verificar la cuenta de Meta Business (no cobran por los
  primeros miles de conversaciones al mes).

Dime cuál eliges y te acompaño en los pasos.

## Los pasos en Meta (te guío en vivo cuando estés listo)
1. Entra a **developers.facebook.com** con tu Facebook y crea una **App** tipo
   "Business".
2. Agrega el producto **WhatsApp** a esa app. Meta te da un **número de prueba**
   gratis para empezar y luego conectas el número real (nuevo o migrado).
3. En el panel de WhatsApp verás:
   - **Phone number ID** (un número largo) → es tu `WHATSAPP_PHONE_NUMBER_ID`.
   - Un **token temporal** de 24 h para probar. Para producción se genera un
     **token permanente** con un "System User" (te guío; es 1 pantalla).
4. **App Secret**: en Configuración → Básica de la app, "Mostrar" el secreto → es tu
   `WHATSAPP_APP_SECRET`.
5. **Webhook**: en el panel de WhatsApp → Configuración → Webhooks, pones:
   - **Callback URL**: `https://TU-DOMINIO/api/webhook/whatsapp`
     (el dominio de tu app en Vercel).
   - **Verify token**: inventas una frase cualquiera (p. ej. `aurelle-webhook-2026`)
     → esa MISMA frase va en Vercel como `WHATSAPP_VERIFY_TOKEN`.
   - Meta hará un "handshake"; si el token coincide, queda verificado (✓).
   - **Suscríbete al campo `messages`** (para recibir los mensajes entrantes).

## Lo que pegas en Vercel (Settings → Environment Variables)
| Variable | Qué es | De dónde sale |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Token permanente (System User) | Panel de Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número emisor | Panel de WhatsApp |
| `WHATSAPP_VERIFY_TOKEN` | La frase que inventaste | La eliges tú (misma en Meta) |
| `WHATSAPP_APP_SECRET` | Secreto de la app | Configuración → Básica |
| `ANTHROPIC_API_KEY` | Llave de la IA (el bot) | console.anthropic.com → API Keys |

Opcionales:
- `ANTHROPIC_MODEL` — para bajar costo del bot puedes poner `claude-haiku-4-5`
  (por defecto usa el modelo de mayor calidad).
- `WHATSAPP_API_VERSION` — normalmente no hace falta (usa `v21.0`).

Después de pegarlas, **haz un redeploy** en Vercel para que tomen efecto.

## Cómo saber si quedó
- En Meta, el webhook muestra ✓ verificado.
- Le escribes un WhatsApp al número desde tu celular: debería aparecer en el ERP en
  **Clientes → Inbox** (crea el cliente solo con tu número).
- Si el bot está encendido (hay `ANTHROPIC_API_KEY`), verás una respuesta automática
  para lo simple, o una "Respuesta sugerida por la IA" para aprobar si es delicado
  (2ct+, quejas, precios).
- Si algo no llega: revisa que el webhook esté suscrito a `messages` y que el token
  coincida exactamente.

## Notas de seguridad (ya resueltas en el código)
- El webhook valida la firma de Meta (`WHATSAPP_APP_SECRET`), así nadie más puede
  meter mensajes falsos.
- El bot NUNCA da precios ni promete fechas; lo delicado siempre pasa por una persona.
- Los datos de finanzas/márgenes siguen siendo solo-admin; el bot no los toca.
