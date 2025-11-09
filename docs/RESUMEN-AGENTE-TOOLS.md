# ✅ RESUMEN - Agente con Tools para n8n

## 🎯 Lo que tenés ahora

Un sistema **mucho más simple** donde el agente LLM decide cuándo usar cada herramienta:

### 📦 2 Tools para el Agente:

1. **`buscar_productos`** - Busca neumáticos en DB según medida/marca/región
2. **`actualizar_estado`** - Actualiza estado del lead y registra tracking

### 📄 3 Documentos Nuevos:

1. **`docs/n8n-agent-tools.md`** ⭐
   - Especificaciones técnicas de las 2 tools
   - Input/Output schemas (JSON)
   - Ejemplos de uso
   - Configuración en n8n

2. **`docs/prompt-agente-con-tools.md`** 🤖
   - Prompt completo para el agente (copiar en System Message)
   - Instrucciones de cuándo y cómo usar cada tool
   - Flujo de trabajo completo
   - Ejemplos de conversaciones
   - Casos especiales

3. **`docs/n8n-configuracion-agente-tools.md`** 🔧
   - Guía paso a paso de configuración en n8n
   - 5 nodes (en vez de 12+)
   - Cómo conectar las tools
   - Testing y troubleshooting

---

## 🏗️ Arquitectura Final (Simplificada)

```
Cliente WhatsApp
    ↓
n8n Webhook
    ↓
Function: Detectar Región
    ↓
Agente LLM (GPT-4/Claude)
    ├── Tool: buscar_productos ──→ POST /api/n8n/buscar-neumaticos
    └── Tool: actualizar_estado ──→ POST /api/n8n/actualizar-estado
    ↓
Enviar WhatsApp
```

**5 nodes totales** (antes eran 12+) 🎉

---

## 🚀 Implementación Rápida (20 minutos)

### Paso 1: Variables de Entorno en n8n (2 min)
```env
TOPNEUM_API_URL=https://tu-dominio.vercel.app
N8N_API_KEY=topneum_n8n_2025_secure_key
WHATSAPP_TOKEN=EAA...
WHATSAPP_PHONE_ID=123456789
OPENAI_API_KEY=sk-... (o ANTHROPIC_API_KEY)
```

### Paso 2: Crear 5 Nodes en n8n (10 min)

1. **Webhook** - Recibe WhatsApp
2. **Function** - Detectar Región (código en docs)
3. **HTTP Request** - `buscar_productos` (configurar como Tool)
4. **HTTP Request** - `actualizar_estado` (configurar como Tool)
5. **Agente LLM** - Con prompt y tools conectadas
6. **HTTP Request** - Enviar WhatsApp

### Paso 3: Copiar Prompt al Agente (2 min)

Abrir `docs/prompt-agente-con-tools.md` → Copiar TODO → Pegar en System Message del agente

### Paso 4: Conectar Tools (3 min)

En el node del Agente:
- Tools → Add Tool → HTTP Request Tool → Elegir `buscar_productos`
- Tools → Add Tool → HTTP Request Tool → Elegir `actualizar_estado`

### Paso 5: Test (3 min)

Execute Workflow → Listen for Test Webhook → Enviar request de prueba

---

## 💡 Ventajas de este Enfoque

✅ **Más simple**: 5 nodes en vez de 12+
✅ **Más inteligente**: El agente decide cuándo usar cada tool
✅ **Más flexible**: El agente puede llamar múltiples tools en una conversación
✅ **Menos mantenimiento**: No necesitás IF nodes ni Function nodes intermedios
✅ **Mejor tracking**: Cada interacción importante queda registrada automáticamente
✅ **Natural**: El agente razona y actúa como un humano

---

## 🔄 Ejemplo de Flujo Completo

### Cliente escribe: "Hola, necesito precio de 205/55R16"

**El agente hace automáticamente:**

1. 🔍 **Detecta** que necesita buscar productos
2. 🔧 **Llama tool** `buscar_productos`:
   ```json
   {
     "telefono_whatsapp": "+54 9 11 1234 5678",
     "medida_neumatico": "205/55R16",
     "region": "CABA",
     "tipo_consulta": "cotizacion"
   }
   ```
3. ✅ **Recibe** lista de 5 productos con precios
4. 🔧 **Llama tool** `actualizar_estado`:
   ```json
   {
     "nuevo_estado": "consulta_producto",
     "datos_adicionales": { "medida_neumatico": "205/55R16" }
   }
   ```
5. 💬 **Envía** cotización al cliente con los 5 productos
6. 🔧 **Llama tool** `actualizar_estado` nuevamente:
   ```json
   {
     "nuevo_estado": "cotizacion_enviada",
     "datos_adicionales": { "cantidad_opciones": 5 }
   }
   ```

**Todo esto en 1 sola interacción!** El agente usa las tools inteligentemente.

---

## 📊 Tools: Cuándo se Usan

### Tool: `buscar_productos`

**Se usa cuando:**
- Cliente menciona medida (205/55R16, 185/65/15, etc)
- Cliente pide precios
- Cliente pregunta por stock

**NO se usa cuando:**
- Cliente solo saluda
- Cliente pregunta por garantía/envío
- Cliente menciona MICHELIN o BF GOODRICH (casos especiales)

### Tool: `actualizar_estado`

**Se usa cuando:**
- Cliente pasa a nueva etapa
- Se completa una acción importante
- Hay datos nuevos relevantes

**Estados disponibles:**
- `conversacion_iniciada` → Primer mensaje
- `consulta_producto` → Cliente consultó medida
- `cotizacion_enviada` → Se enviaron precios
- `en_proceso_de_pago` → Cliente eligió producto y forma de pago
- `turno_pendiente` → Cliente eligió tipo de entrega
- `turno_agendado` → Fecha/hora confirmada

**NO se usa para:**
- Estado `pagado` (lo marca el CRM manualmente)
- Estados posteriores (`pedido_enviado`, `pedido_finalizado`)

---

## 🔐 Seguridad

Ambas tools requieren:
- Header `x-api-key` con la key configurada
- La key debe coincidir entre n8n y el backend

**Ya implementado en los endpoints:**
```typescript
const apiKey = request.headers.get('x-api-key')
if (apiKey !== process.env.N8N_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 📋 Checklist de Implementación

### Backend (ya lo tenés ✅)
- [x] Endpoint `/api/n8n/buscar-neumaticos` funcionando
- [x] Endpoint `/api/n8n/actualizar-estado` funcionando
- [x] Base de datos con schema de leads (ejecutar `005-create-leads-schema.sql`)

### n8n (lo que necesitás hacer)
- [ ] Configurar variables de entorno
- [ ] Crear 5 nodes según guía
- [ ] Copiar prompt del agente
- [ ] Conectar tools al agente
- [ ] Testear con mensaje de prueba
- [ ] Verificar que estados se registran en DB
- [ ] Activar workflow
- [ ] Configurar webhook en WhatsApp

---

## 📚 Documentos de Referencia

| Documento | Propósito |
|-----------|-----------|
| `docs/n8n-agent-tools.md` | Specs técnicas de las 2 tools |
| `docs/prompt-agente-con-tools.md` | Prompt completo para copiar al agente |
| `docs/n8n-configuracion-agente-tools.md` | Guía paso a paso de configuración |
| `docs/RESUMEN-AGENTE-TOOLS.md` | Este documento (resumen ejecutivo) |

---

## 🎯 Próximos Pasos

1. **Ejecutar schema SQL** (si no lo hiciste):
   ```bash
   psql $DATABASE_URL -f scripts/005-create-leads-schema.sql
   ```

2. **Agregar columna precio interior** (si no lo hiciste):
   ```sql
   ALTER TABLE products ADD COLUMN efectivo_interior_sin_iva DECIMAL(10,2);
   UPDATE products SET efectivo_interior_sin_iva = efectivo_bsas_sin_iva * 1.05;
   ```

3. **Configurar workflow en n8n**:
   - Seguir `docs/n8n-configuracion-agente-tools.md`

4. **Testear**:
   - Enviar mensaje de prueba
   - Verificar que tools se ejecutan
   - Verificar que estados se registran en DB

5. **Activar**:
   - Activar workflow en n8n
   - Configurar webhook en WhatsApp Business

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| El agente no llama las tools | Verificar que están conectadas y que el prompt está copiado |
| Tool retorna 401 | Verificar `N8N_API_KEY` en ambos lados (n8n y backend) |
| Estados no se actualizan en DB | Ejecutar script SQL `005-create-leads-schema.sql` |
| No encuentra productos | Verificar que la medida existe en tabla `products` |
| Agente da respuestas genéricas | Verificar que el prompt está completo en System Message |

---

## ✨ Diferencias con el Enfoque Anterior

| Antes (12+ nodes) | Ahora (5 nodes) |
|-------------------|-----------------|
| IF node para búsqueda | Agente decide cuándo buscar |
| Function node preparar estado | Agente prepara datos |
| Set node formatear mensaje | Agente formatea respuesta |
| Múltiples HTTP Requests | Solo 2 tools reutilizables |
| Flujo rígido | Flujo flexible y adaptable |

---

## 🎉 Conclusión

Ahora tenés:
- ✅ **2 tools** listas para usar
- ✅ **Prompt completo** con instrucciones claras
- ✅ **Configuración simple** (5 nodes)
- ✅ **Tracking automático** en cada interacción
- ✅ **Agente inteligente** que decide cuándo actuar

**¡Todo listo para implementar! 🚀**

---

## 💬 Ayuda Adicional

Si necesitás ayuda con:
- Configuración específica de n8n
- Ajustes al prompt del agente
- Troubleshooting de algún issue
- Agregar funcionalidades

Tenés toda la documentación en la carpeta `docs/` con ejemplos completos.

**¡Éxitos con el agente! 🤖💨**
