# Guía: conectar WhatsApp al ERP (para Santiago)

> Objetivo: que los clientes de los ads lleguen al ERP (crean su ficha solos en el
> CRM), las respuestas salgan por el número oficial y el bot de IA ayude desde el
> día 1. Es un trámite en el panel de Meta + pegar 5 datos en Vercel. Una sola vez.

## El plan (decidido el 2026-07-08 con Santiago)

- **Número NUEVO (la eSIM comprada hoy) → a la Cloud API.** Está activa y nunca se
  registró en WhatsApp: es el estado ideal, no hay nada que borrar ni migrar.
- **El número actual del cel del negocio NO se toca.** Sigue recibiendo los ads y
  los chats de siempre durante toda la transición. Cero riesgo de perder leads.
- **Los ads (botón "Enviar mensaje de WhatsApp") se re-apuntan al número nuevo AL
  FINAL**, cuando ya hayas probado que los mensajes entran al ERP.
- **Bot con IA desde el día 1** (necesitas una API key de Anthropic, paso 6).

Reglas de la eSIM mientras tanto:
- Tenla a la mano en un celular que reciba **SMS o llamada** el día del trámite
  (Meta manda un código para verificar el número). Después de eso el número "vive
  en la nube" y no necesita el celular.
- **No instales WhatsApp con ese número nunca** — si lo registras en la app, deja
  de servir para la API.
- **No canceles la línea** con la compañía: mantenla activa (aunque sea con la
  recarga mínima) para que nadie recicle el número.

## Los pasos en Meta (te guío en vivo cuando estés listos)

> Hazlo todo con TU cuenta: la app y la cuenta de WhatsApp Business (WABA) deben
> quedar dentro del **mismo Meta Business Manager donde corren los ads de Aurelle**.
> Así el botón de WhatsApp de los ads podrá elegir el número nuevo al final.

1. Entra a **developers.facebook.com** con tu Facebook y crea una **App** tipo
   "Business". Al crearla, asóciala a tu Business Manager (el de los ads).
2. Agrega el producto **WhatsApp** a esa app. Meta te da un **número de prueba**
   gratis para el primer test; luego, en "Agregar número de teléfono", conectas el
   número de la eSIM (aquí llega el código por SMS/llamada).
3. En el panel de WhatsApp verás:
   - **Phone number ID** (un número largo) → es tu `WHATSAPP_PHONE_NUMBER_ID`.
     Ojo: es el ID del número NUEVO, no el número en sí.
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
   - Importante: el webhook debe existir ANTES de este paso — es decir, el código
     del riel ya desplegado en Vercel. Si Meta marca error en el handshake, avisa.
6. **API key del bot**: en **console.anthropic.com** → API Keys, crea una llave →
   es tu `ANTHROPIC_API_KEY`. (Tiene costo por mensaje; con el volumen de ads
   normal es bajo, y lo delicado el bot NO lo responde solo.)

Nota: Meta puede pedir **verificar el negocio** (documentos de Aurelle) para subir
los límites de mensajes. Con el negocio ya anunciándose en Meta suele ser rápido.
Sin verificar también funciona, con límites bajos al inicio.

## Lo que pegas en Vercel (Settings → Environment Variables)
| Variable | Qué es | De dónde sale |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Token permanente (System User) | Panel de Meta |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número emisor (el nuevo) | Panel de WhatsApp |
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
- Le escribes un WhatsApp al número nuevo desde tu celular: debería aparecer en el
  ERP en **Clientes → Inbox** (crea el cliente solo, con tu número).
- Con el bot encendido verás una respuesta automática para lo simple, o una
  "Respuesta sugerida por la IA" para aprobar si es delicado (2ct+, quejas, precios).
- Si algo no llega: revisa que el webhook esté suscrito a `messages` y que el token
  coincida exactamente.

## El corte de los ads (al final, cuando todo lo anterior ya funciona)
1. Prueba 2–3 días con mensajes tuyos y de Fer al número nuevo; ajusta plantillas
   y revisa cómo responde el bot.
2. En el Administrador de anuncios, edita los ads con botón de WhatsApp para que
   apunten al **número nuevo** (aparece en la lista porque la WABA vive en tu
   Business Manager).
3. El número viejo del cel del negocio sigue vivo para los chats ya empezados;
   los clientes nuevos de los ads ya entran directo al ERP. Con el tiempo, el cel
   queda solo como archivo de conversaciones viejas.

## Notas de seguridad (ya resueltas en el código)
- El webhook valida la firma de Meta (`WHATSAPP_APP_SECRET`), así nadie más puede
  meter mensajes falsos.
- El bot NUNCA da precios ni promete fechas; lo delicado siempre pasa por una persona.
- Los datos de finanzas/márgenes siguen siendo solo-admin; el bot no los toca.
