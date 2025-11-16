# Integración WhatsApp - Evolution API vs API Oficial

## Comparativa rápida

| Criterio | Evolution API | WhatsApp Business API (Oficial) |
|----------|---------------|----------------------------------|
| **Costo mensual** | Gratis (self-hosted) | ~USD 50/mes + mensajes |
| **Setup inicial** | 2-4 horas | 2-3 días (aprobación Meta) |
| **Límites de envío** | Sin límites oficiales | 1000/día tier 1, escala con uso |
| **Funciones avanzadas** | Completas (media, buttons, lists) | Completas + analytics |
| **Riesgo de ban** | Medio (uso no oficial) | Bajo (oficial) |
| **Mantenimiento** | Manual (updates) | Manejado por Meta |
| **Soporte** | Comunidad | Meta Business Support |

## Recomendación: **Evolution API para MVP, migrar a API Oficial en producción**

### Razones:
1. **Testing rápido**: Evolution API permite iterar sin costos ni aprobaciones
2. **Flexibilidad**: Ideal para probar flujos complejos sin restricciones de tier
3. **Migración sencilla**: Ambas usan el mismo formato de mensajes (estructuras JSON similares)

## Plan de Integración

### Fase 1: Evolution API (actual - 2 semanas)
```bash
# Instalar Evolution API (Docker)
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=tu-api-key-secreta \
  atendai/evolution-api:latest
```

**Endpoints clave:**
- `POST /instance/create` - Crear instancia de WhatsApp
- `POST /message/sendText` - Enviar texto
- `POST /message/sendMedia` - Enviar imagen/PDF
- `POST /webhook/set` - Configurar webhook para recibir mensajes
- `GET /instance/qrcode` - Obtener QR para conectar

**Flujo de mensajes:**
```
Cliente envía mensaje
    ↓
Evolution API → Webhook a nn8n
    ↓
nn8n procesa con LLM + tools
    ↓
nn8n → Evolution API (enviar respuesta)
```

### Fase 2: API Oficial (producción - 1 mes después)
1. **Registrar Business App** en Meta for Developers
2. **Solicitar número** de WhatsApp Business
3. **Verificación** (esperar aprobación, 1-3 días)
4. **Configurar webhook** en Meta Dashboard
5. **Migrar código** de Evolution a API Oficial

**Endpoints oficiales:**
- `POST /v18.0/{phone-id}/messages` - Enviar mensajes
- Webhook entrante configurado en Meta Dashboard

## Implementación actual (Evolution API)

### Archivo de configuración recomendado
`lib/whatsapp.ts`:
```typescript
const EVOLUTION_BASE_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

export async function sendWhatsAppMessage(to: string, text: string) {
  const res = await fetch(`${EVOLUTION_BASE_URL}/message/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: to,
      text: text,
    }),
  })
  if (!res.ok) throw new Error('Error enviando mensaje WhatsApp')
  return res.json()
}

export async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string) {
  const res = await fetch(`${EVOLUTION_BASE_URL}/message/sendMedia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: to,
      mediatype: 'image',
      media: imageUrl,
      caption: caption,
    }),
  })
  if (!res.ok) throw new Error('Error enviando imagen WhatsApp')
  return res.json()
}
```

### Webhook handler
`app/api/webhooks/whatsapp/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Evolution API webhook format
    const { data } = body
    const from = data.key.remoteJid.replace('@s.whatsapp.net', '')
    const message = data.message.conversation || data.message.extendedTextMessage?.text
    
    // Buscar o crear lead
    let lead = await sql`
      SELECT id FROM leads WHERE telefono_whatsapp = ${from}
    `
    
    if (lead.length === 0) {
      // Crear nuevo lead
      lead = await sql`
        INSERT INTO leads (telefono_whatsapp, estado, origen, created_at, ultima_interaccion)
        VALUES (${from}, 'nuevo', 'whatsapp', NOW(), NOW())
        RETURNING id
      `
    }
    
    const leadId = lead[0].id
    
    // Aquí llamar a nn8n o procesar directamente
    // Por ahora solo guardamos el mensaje
    await sql`
      UPDATE leads 
      SET ultima_interaccion = NOW()
      WHERE id = ${leadId}
    `
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

## Variables de entorno necesarias

`.env.local`:
```bash
# Evolution API
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=tu-api-key-secreta
EVOLUTION_INSTANCE_NAME=topneum-prod

# API Oficial (para migración futura)
WHATSAPP_BUSINESS_PHONE_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

## Testing

### Con Evolution API:
```bash
# 1. Obtener QR code
curl http://localhost:8080/instance/qrcode \
  -H "apikey: tu-api-key"

# 2. Escanear con WhatsApp

# 3. Enviar mensaje de prueba
curl -X POST http://localhost:8080/message/sendText \
  -H "Content-Type: application/json" \
  -H "apikey: tu-api-key" \
  -d '{
    "number": "5493416123456",
    "text": "Hola! Este es un mensaje de prueba"
  }'
```

## Próximos pasos
1. ✅ Instalar Evolution API en servidor de staging
2. ⏳ Configurar webhook en nn8n
3. ⏳ Implementar `lib/whatsapp.ts`
4. ⏳ Crear endpoint `/api/webhooks/whatsapp`
5. ⏳ Testing con números reales
6. ⏳ Documentar flujos de mensajes complejos (botones, listas)

## Recursos
- [Evolution API Docs](https://doc.evolution-api.com/)
- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [nn8n WhatsApp Integration](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsapp/)
