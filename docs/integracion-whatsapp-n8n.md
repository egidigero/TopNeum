# 📱 Integración WhatsApp + n8n + TopNeum

## 🎯 Objetivo

Permitir a los clientes consultar precios y stock de neumáticos por WhatsApp, con un agente LLM que normaliza las entradas y un backend que busca eficientemente en la base de datos.

## 🏗️ Arquitectura del Sistema

```
Cliente WhatsApp
    ↓ mensaje informal: "205 55 16", "necesito michelin 205/55/16"
    
n8n Webhook (recibe mensaje)
    ↓
    
n8n Agente LLM (OpenAI/Anthropic)
    ↓ usa PROMPT de normalización
    ↓ Output JSON: {"medida_neumatico": "205/55R16", "marca": "MICHELIN"}
    
n8n HTTP Request Node
    ↓ POST a /api/n8n/buscar-neumaticos
    
Next.js API Endpoint
    ↓ Búsqueda en PostgreSQL con normalización
    ↓ Ordenamiento inteligente (marcas premium primero)
    
JSON con productos + mensaje WhatsApp
    ↓
    
n8n WhatsApp Send Node
    ↓
    
Respuesta al cliente
```

## 📂 Archivos Implementados

### 1. **PROMPT para Agente LLM** 
📄 `docs/prompt-agente-n8n.md` (147 líneas)

- **Rol**: Asistente especializado en neumáticos TopNeum
- **Contexto**: Formatos válidos, cómo escriben los clientes
- **Tarea**: Extraer y normalizar medida del mensaje
- **Output JSON**: Medida, marca, familia, tipo_vehículo, confianza
- **Ejemplos**: 15+ casos de normalización
- **Validaciones**: Medidas inválidas, información incompleta

**Casos cubiertos:**
- "205 55 16" → "205/55R16"
- "michelin 205/55/16" → "205/55R16" + marca "MICHELIN"
- "31x10.50 para camioneta" → "31X10.50R15LT"
- "necesito pirelli 225/45/17" → "225/45R17" + marca "PIRELLI"

### 2. **Endpoint de Búsqueda**
📄 `app/api/n8n/buscar-neumaticos/route.ts`

**Características:**
- ✅ Recibe JSON normalizado del agente
- ✅ Auth con `x-api-key` (N8N_API_KEY)
- ✅ Búsqueda con normalización en SQL
- ✅ Filtro por marca opcional
- ✅ Ordenamiento inteligente (marcas premium primero)
- ✅ Límite de 20 productos
- ✅ Formateo de mensaje para WhatsApp
- ✅ Manejo de errores y casos sin resultados

**Input esperado:**
```json
{
  "medida_neumatico": "205/55R16",
  "marca": "MICHELIN",
  "tipo_consulta": "busqueda_general"
}
```

**Output:**
```json
{
  "productos": [...],
  "mensaje": "🔍 Encontramos 5 opciones para 205/55R16:\n\n...",
  "cantidad": 5,
  "medida_buscada": "205/55R16",
  "marca_buscada": "MICHELIN",
  "tipo": "busqueda_general"
}
```

### 3. **Guía de Testing**
📄 `docs/test-buscar-neumaticos.md`

- Ejemplos con cURL
- Ejemplos con PowerShell
- 7 casos de prueba documentados
- Checklist de validación
- Ejemplos de respuestas esperadas

### 4. **Script de Corrección de Medidas**
📄 `scripts/004-fix-medidas-mal-formateadas.sql`

- Corrección de ~100 medidas mal formateadas
- Casos específicos identificados:
  - `185` / `R15-103R` → `185R15` / `103R`
  - `235/65` / `R16C` → `235/65R16C` / ``
  - `R` / `245/45R20` → `245/45R20` / ``
- Queries de verificación
- Estadísticas post-corrección
- Casos especiales (LT, C, ZR, Run Flat)

## 🔍 Query SQL de Búsqueda

```sql
SELECT 
  marca, familia, diseno, medida, indice,
  cuota_3, cuota_6, cuota_12,
  efectivo_bsas_sin_iva, stock, sku
FROM products
WHERE 
  -- Normalización: quitar separadores y comparar
  REPLACE(REPLACE(REPLACE(UPPER(medida), '/', ''), '-', ''), ' ', '') 
  = REPLACE(REPLACE(REPLACE(UPPER($medida), '/', ''), '-', ''), ' ', '')
  
  -- Filtro por marca si viene del agente
  AND ($marca IS NULL OR UPPER(marca) = UPPER($marca))
  
  -- Solo con stock
  AND stock IS NOT NULL AND stock != ''
  
ORDER BY 
  -- 1. Prioridad si marca especificada
  CASE 
    WHEN $marca IS NOT NULL AND UPPER(marca) = UPPER($marca) THEN 1
    ELSE 2
  END,
  
  -- 2. Marcas premium primero
  CASE UPPER(marca)
    WHEN 'MICHELIN' THEN 1
    WHEN 'BRIDGESTONE' THEN 2
    WHEN 'PIRELLI' THEN 3
    WHEN 'GOODYEAR' THEN 4
    WHEN 'YOKOHAMA' THEN 5
    WHEN 'HANKOOK' THEN 6
    WHEN 'CONTINENTAL' THEN 7
    ELSE 8
  END,
  
  -- 3. Por precio (variedad)
  cuota_3 ASC NULLS LAST
  
LIMIT 20
```

## 💬 Formato de Mensaje WhatsApp

```
🔍 Encontramos 5 opciones para 205/55R16:

━━━━━━━━━━━━━━━━━

*1. 205/55R16 91H MICHELIN PRIMACY 3*
💳 3 CUOTAS SIN INTERÉS: *$95.000*
💳 6 CUOTAS: *$50.000*
💵 PROMO CONTADO: *$270.000*
📦 ✅ Disponible

*2. 205/55R16 94V YOKOHAMA BLUEARTH*
💳 3 CUOTAS SIN INTERÉS: *$75.000*
💵 PROMO CONTADO: *$210.000*
📦 ✅ Disponible

━━━━━━━━━━━━━━━━━

✅ *Envío gratis* a todo el país (llevando 2 o más)
🔧 *Colocación BONIFICADA* (llevando 4)
💳 Consultá por 6 y 12 cuotas
🛡️ *5 años* de garantía oficial de fábrica

¿Te interesa alguna opción? 😊
```

## 🧪 Pruebas Locales

### Con PowerShell

```powershell
$headers = @{
    "x-api-key" = "topneum_n8n_2025_secure_key_change_this"
    "Content-Type" = "application/json"
}

$body = @{
    medida_neumatico = "205/55R16"
    tipo_consulta = "busqueda_general"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

### Con cURL

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "205/55R16",
    "marca": "MICHELIN",
    "tipo_consulta": "busqueda_general"
  }'
```

## 📊 Base de Datos

### Estructura de `products`

```sql
products (
  id UUID PRIMARY KEY,
  sku TEXT UNIQUE,
  marca TEXT,              -- MICHELIN, YOKOHAMA, HANKOOK
  familia TEXT,            -- PRIMACY, BLUEARTH, VENTUS
  diseno TEXT,             -- 3 ZP, ES32, S1 EVO2
  medida TEXT,             -- 205/55R16 (limpia, sin índice)
  indice TEXT,             -- 91H, 94V, XL (separado desde migración)
  cuota_3 DECIMAL,
  cuota_6 DECIMAL,
  cuota_12 DECIMAL,
  efectivo_bsas_sin_iva DECIMAL,
  stock TEXT,
  ...
)
```

### Estadísticas

- **Total productos**: 1329
- **Medidas únicas**: 385
- **Índices únicos**: 367
- **Medidas mal formateadas**: ~100 (identificadas, script listo para corregir)

## 🚀 Próximos Pasos

### 1. Corregir Medidas Mal Formateadas (prioritario)

```bash
# En psql o Azure Data Studio
\i scripts/004-fix-medidas-mal-formateadas.sql
```

### 2. Testear Endpoint

- [ ] Ejecutar tests con cURL/PowerShell
- [ ] Verificar normalización SQL funciona
- [ ] Verificar filtro por marca
- [ ] Verificar ordenamiento
- [ ] Verificar formato de precios
- [ ] Verificar mensaje WhatsApp

### 3. Configurar n8n Workflow

#### Nodes necesarios:

1. **Webhook Trigger**
   - URL: `/webhook/whatsapp`
   - Method: POST
   - Response mode: Last Node

2. **OpenAI/Anthropic Node** (Agente LLM)
   - Model: GPT-4 o Claude 3.5 Sonnet
   - System prompt: Copiar de `docs/prompt-agente-n8n.md`
   - Output format: JSON
   - Temperature: 0.2 (preciso)

3. **HTTP Request Node**
   - URL: `https://tu-dominio.com/api/n8n/buscar-neumaticos`
   - Method: POST
   - Headers: 
     - `x-api-key`: `{{$env.N8N_API_KEY}}`
     - `Content-Type`: `application/json`
   - Body: `{{$json.output}}`

4. **WhatsApp Send Message Node**
   - Message: `{{$json.mensaje}}`
   - Parse mode: Markdown

### 4. Testear Flujo Completo

- [ ] Enviar mensaje a WhatsApp: "205 55 16"
- [ ] Verificar agente normaliza correctamente
- [ ] Verificar endpoint devuelve productos
- [ ] Verificar mensaje llega a WhatsApp formateado
- [ ] Probar con diferentes formatos:
  - "necesito michelin 205/55/16"
  - "cuanto sale 175/65R14"
  - "tenés stock de 31x10.50 para camioneta?"

### 5. Documentar Workflow n8n

- [ ] Screenshot de cada node
- [ ] Configuración de credentials
- [ ] Variables de entorno necesarias
- [ ] Casos de prueba

## 📝 Notas Importantes

### Formatos Válidos de Medidas

- **Standard**: 205/55R16, 175/65R14
- **Alta velocidad**: 225/45ZR17, 255/35ZR18
- **Camionetas**: 31X10.50R15LT, 265/70R16LT
- **Comerciales**: 235/65R16C, 195R14C

### Normalización

El endpoint normaliza automáticamente las medidas:
- Entrada: "205/55R16" o "205 55 16" o "205-55-16"
- Normalizada: "20555R16"
- Comparación flexible en SQL

### Ordenamiento de Resultados

1. **Prioridad marca**: Si cliente pidió marca específica, primero esa
2. **Marcas premium**: Michelin, Bridgestone, Pirelli, Goodyear
3. **Por precio**: Ascendente (más baratos primero)
4. **Límite**: 20 productos

### Seguridad

- ✅ API Key requerida (`x-api-key`)
- ✅ Validación de input
- ✅ Manejo de errores
- ✅ Rate limiting (configurar en n8n si es necesario)

## 🐛 Debugging

### Logs del Endpoint

```
[n8n] 📥 Recibido del agente: { medida_neumatico: '205/55R16', marca: 'MICHELIN', ... }
[n8n] 🔍 Buscando: 20555R16 marca: MICHELIN
[n8n] 📊 Encontrados: 5 productos
```

### Verificar en PostgreSQL

```sql
-- Ver productos por medida normalizada
SELECT 
  REPLACE(REPLACE(REPLACE(UPPER(medida), '/', ''), '-', ''), ' ', '') as medida_normalizada,
  medida,
  indice,
  marca,
  COUNT(*) as cantidad
FROM products
WHERE REPLACE(REPLACE(REPLACE(UPPER(medida), '/', ''), '-', ''), ' ', '') = '20555R16'
GROUP BY medida_normalizada, medida, indice, marca;
```

## 📞 Soporte

Para problemas o dudas:
- Ver logs del servidor Next.js
- Ver logs de n8n workflow
- Revisar documentación en `docs/`
- Ejecutar queries de verificación en `scripts/`
