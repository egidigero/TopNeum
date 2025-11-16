# Testing E2E - Flujo Completo Lead → Pedido

Este script simula el recorrido completo de un cliente desde que envía el primer mensaje hasta que confirma su pedido.

## Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

## Script de prueba

`tests/e2e/lead-to-pedido.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Flujo completo: Lead → Consulta → Cotización → Turno → Pedido', () => {
  const testPhone = '+5493416555555'
  let leadId: string
  let consultaId: string
  let cotizacionId: string
  let turnoId: string
  let pedidoId: string

  test.beforeAll(async () => {
    // Limpiar datos de prueba anteriores
    // (ejecutar en DB de testing)
  })

  test('1. Crear lead desde WhatsApp webhook', async ({ request }) => {
    const response = await request.post('/api/webhooks/whatsapp', {
      data: {
        data: {
          key: {
            remoteJid: testPhone.replace('+', '') + '@s.whatsapp.net'
          },
          message: {
            conversation: 'Hola, necesito neumáticos 205/55 R16 para mi Fiat Cronos'
          }
        }
      }
    })
    expect(response.ok()).toBeTruthy()
    
    // Verificar lead creado
    const leadsResponse = await request.get('/api/leads')
    const { leads } = await leadsResponse.json()
    const lead = leads.find((l: any) => l.telefono_whatsapp === testPhone)
    expect(lead).toBeDefined()
    expect(lead.estado).toBe('nuevo')
    leadId = lead.id
  })

  test('2. Crear consulta del lead', async ({ request }) => {
    const response = await request.post('/api/consultas', {
      data: {
        lead_id: leadId,
        medida_neumatico: '205/55 R16',
        marca_preferida: 'Michelin',
        tipo_vehiculo: 'Fiat Cronos',
        cantidad: 4
      }
    })
    expect(response.ok()).toBeTruthy()
    const { consulta } = await response.json()
    consultaId = consulta.id
  })

  test('3. Generar cotización', async ({ request }) => {
    const response = await request.post('/api/cotizaciones', {
      data: {
        lead_id: leadId,
        consulta_id: consultaId,
        productos_mostrados: [
          {
            id: 'prod-123',
            descripcion: 'Michelin Energy XM2+ 205/55 R16 91V',
            precio: 112000,
            cantidad: 4
          }
        ],
        precio_total_contado: 448000,
        precio_total_3cuotas: 470000,
        region: 'ROSARIO'
      }
    })
    expect(response.ok()).toBeTruthy()
    const { cotizacion } = await response.json()
    cotizacionId = cotizacion.id
    
    // Actualizar estado del lead
    await request.patch(`/api/leads/${leadId}`, {
      data: { estado: 'cotizado' }
    })
  })

  test('4. Cliente acepta y agenda turno (ingresa datos personales)', async ({ request }) => {
    const response = await request.post('/api/turnos', {
      data: {
        lead_id: leadId,
        tipo: 'colocacion',
        fecha: '2025-11-20',
        hora_inicio: '10:00',
        email: 'cliente@test.com',
        telefono: testPhone,
        dni: '12345678',
        datos_envio: {
          direccion: 'Calle Falsa 123',
          localidad: 'Rosario',
          provincia: 'Santa Fe',
          codigo_postal: '2000'
        }
      }
    })
    expect(response.ok()).toBeTruthy()
    const { turno } = await response.json()
    turnoId = turno.id
    expect(turno.email).toBe('cliente@test.com')
    
    // Actualizar estado del lead
    await request.patch(`/api/leads/${leadId}`, {
      data: { estado: 'esperando_pago' }
    })
  })

  test('5. Cliente informa pago (crear pedido)', async ({ request }) => {
    const response = await request.post('/api/pedidos', {
      data: {
        lead_id: leadId,
        turno_id: turnoId,
        cotizacion_id: cotizacionId,
        forma_pago: 'transferencia',
        total: 448000,
        estado_pago: 'pago_informado',
        productos: [
          {
            producto_id: 'prod-123',
            cantidad: 4,
            precio_unitario: 112000
          }
        ]
      }
    })
    expect(response.ok()).toBeTruthy()
    const { pedido } = await response.json()
    pedidoId = pedido.id
    
    // Actualizar estado del lead
    await request.patch(`/api/leads/${leadId}`, {
      data: { estado: 'pago_informado' }
    })
  })

  test('6. Verificar pedido contiene datos del turno', async ({ request }) => {
    const response = await request.get(`/api/pedidos/${pedidoId}`)
    expect(response.ok()).toBeTruthy()
    const { pedido } = await response.json()
    
    // Verificar que los datos del cliente vienen desde turnos
    expect(pedido.cliente_email).toBe('cliente@test.com')
    expect(pedido.cliente_telefono).toBe(testPhone)
    expect(pedido.direccionCompleta).toContain('Calle Falsa 123')
    expect(pedido.direccionCompleta).toContain('Rosario')
    expect(pedido.estado_pago).toBe('pago_informado')
  })

  test('7. Crear ticket si producto requiere verificación', async ({ request }) => {
    // Simular consulta por Michelin (requiere_verificacion=true)
    const ticketResponse = await request.post('/api/tickets', {
      data: {
        lead_id: leadId,
        tipo: 'marca_especial',
        descripcion: `Cliente ${testPhone} consulta por Michelin Energy XM2+ 205/55 R16. Requiere verificación de stock.`,
        prioridad: 'alta'
      }
    })
    expect(ticketResponse.ok()).toBeTruthy()
    const { ticket } = await ticketResponse.json()
    expect(ticket.tipo).toBe('marca_especial')
    expect(ticket.estado).toBe('abierto')
  })

  test('8. Vendedor confirma pago y cierra el ciclo', async ({ request }) => {
    // Actualizar pedido
    await request.patch(`/api/pedidos/${pedidoId}`, {
      data: { estado_pago: 'pagado' }
    })
    
    // Actualizar lead
    const finalResponse = await request.patch(`/api/leads/${leadId}`, {
      data: { estado: 'pedido_confirmado' }
    })
    expect(finalResponse.ok()).toBeTruthy()
    
    // Verificar estado final
    const leadResponse = await request.get(`/api/leads/${leadId}`)
    const { lead } = await leadResponse.json()
    expect(lead.estado).toBe('pedido_confirmado')
  })
})
```

## Ejecutar tests

```bash
# Test E2E completo
npx playwright test tests/e2e/lead-to-pedido.spec.ts

# Con UI
npx playwright test --ui

# Solo un test específico
npx playwright test tests/e2e/lead-to-pedido.spec.ts -g "Crear lead desde WhatsApp"
```

## Checklist manual de QA

### Flujo visual (UI)
- [ ] Lead aparece en kanban como "Nuevo"
- [ ] Al crear consulta, aparece badge con medida en la card
- [ ] Al crear cotización, aparece badge con contador
- [ ] Al agendar turno, aparece sección de turno con fecha/hora
- [ ] Pedido muestra datos del cliente desde turnos
- [ ] Ticket aparece en página /tickets con prioridad correcta

### Datos correctos
- [ ] Email, DNI, dirección NO están en tabla `leads`
- [ ] Email, DNI, dirección SÍ están en tabla `turnos`
- [ ] Pedido muestra dirección desde `turnos.datos_envio`
- [ ] Múltiples consultas aparecen todas en la card (no solo última)
- [ ] Cotizaciones count es correcto

### Edge cases
- [ ] Lead sin consultas muestra mensaje apropiado
- [ ] Lead con 3+ consultas muestra todas sin overflow
- [ ] Turno tipo "envío" muestra campos de tracking
- [ ] Producto Michelin crea ticket automáticamente
- [ ] Eliminar ticket no afecta el lead

## Testing con nn8n

### Configuración de workflow básico:
```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "WhatsApp Webhook",
      "parameters": {
        "path": "whatsapp-incoming",
        "method": "POST"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Buscar Lead",
      "parameters": {
        "url": "={{$env.API_BASE_URL}}/api/leads?telefono={{$json.data.key.remoteJid}}",
        "method": "GET"
      }
    },
    {
      "type": "n8n-nodes-base.openAi",
      "name": "Procesar con GPT",
      "parameters": {
        "resource": "chat",
        "model": "gpt-4",
        "prompt": "{{$json.message}}",
        "systemMessage": "Lee el archivo docs/prompt.md"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Enviar Respuesta WhatsApp",
      "parameters": {
        "url": "={{$env.EVOLUTION_API_URL}}/message/sendText",
        "method": "POST",
        "body": {
          "number": "={{$json.phone}}",
          "text": "={{$json.response}}"
        }
      }
    }
  ]
}
```

## Métricas a validar
- Tiempo promedio lead → pedido confirmado: < 24 horas
- % de leads que llegan a cotización: > 60%
- % de cotizaciones que convierten en pedido: > 40%
- Tiempo de respuesta del agente: < 5 segundos
- Tickets creados automáticamente: verificar precisión > 95%
