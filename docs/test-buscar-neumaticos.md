# Testing del Endpoint `/api/n8n/buscar-neumaticos`

## 📋 Descripción

Endpoint que recibe JSON normalizado del Agente LLM de n8n y busca neumáticos en la base de datos.

## 🔑 Autenticación

```
Header: x-api-key
Valor: (ver N8N_API_KEY en .env.local)
```

## 📥 Input esperado del Agente LLM

```json
{
  "medida_neumatico": "205/55R16",
  "marca": "MICHELIN",
  "tipo_consulta": "busqueda_general"
}
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `medida_neumatico` | string | ✅ | Medida ya normalizada por el agente (ej: "205/55R16") |
| `marca` | string | ❌ | Marca identificada por el agente (ej: "MICHELIN") |
| `tipo_consulta` | string | ❌ | Tipo de consulta: "consulta_precio", "consulta_stock", "busqueda_general" |

## 📤 Output

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

## 🧪 Tests con cURL

### 1. Búsqueda general (sin marca)

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "205/55R16",
    "tipo_consulta": "busqueda_general"
  }'
```

### 2. Búsqueda con marca específica

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

### 3. Consulta de precios

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "205/55R16",
    "tipo_consulta": "consulta_precio"
  }'
```

### 4. Consulta de stock

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "175/65R14",
    "tipo_consulta": "consulta_stock"
  }'
```

### 5. Consulta general (sin medida)

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo_consulta": "consulta_general"
  }'
```

### 6. Medida no encontrada

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: topneum_n8n_2025_secure_key_change_this" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "999/99R99",
    "tipo_consulta": "busqueda_general"
  }'
```

### 7. Autenticación fallida

```bash
curl -X POST "http://localhost:3001/api/n8n/buscar-neumaticos" \
  -H "x-api-key: clave_incorrecta" \
  -H "Content-Type: application/json" \
  -d '{
    "medida_neumatico": "205/55R16"
  }'
```

## 🧪 Tests con PowerShell

### Búsqueda general

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

### Búsqueda con marca

```powershell
$headers = @{
    "x-api-key" = "topneum_n8n_2025_secure_key_change_this"
    "Content-Type" = "application/json"
}

$body = @{
    medida_neumatico = "205/55R16"
    marca = "MICHELIN"
    tipo_consulta = "busqueda_general"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

## 📊 Normalización en SQL

El endpoint normaliza las medidas en el WHERE clause para búsquedas flexibles:

```sql
-- Entrada: "205/55R16" o "205 55 16" o "205-55-16"
-- Todas se normalizan a: "20555R16"

REPLACE(REPLACE(REPLACE(UPPER(medida), '/', ''), '-', ''), ' ', '')
```

## 🎯 Casos de Prueba

| Caso | Input | Output esperado |
|------|-------|-----------------|
| Búsqueda exitosa | `205/55R16` | 5-20 productos |
| Sin marca | `205/55R16` | Todas las marcas |
| Con marca | `205/55R16 MICHELIN` | Solo Michelin |
| Medida no existe | `999/99R99` | Mensaje de error amigable |
| Sin medida | `consulta_general` | Mensaje de bienvenida |
| Sin auth | Sin `x-api-key` | HTTP 401 |

## 🔄 Ordenamiento de Resultados

1. **Prioridad**: Si se especifica marca, primero esa marca
2. **Marcas premium**: Michelin, Bridgestone, Pirelli, Goodyear
3. **Por precio**: Ascendente (más baratos primero)
4. **Límite**: 20 productos

## 💬 Formato del Mensaje WhatsApp

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

## 🐛 Debugging

Ver logs en consola del servidor:

```
[n8n] 📥 Recibido del agente: { medida_neumatico: '205/55R16', marca: 'MICHELIN', ... }
[n8n] 🔍 Buscando: 20555R16 marca: MICHELIN
[n8n] 📊 Encontrados: 5 productos
```

## ✅ Checklist de Testing

- [ ] Endpoint responde HTTP 200 con búsqueda exitosa
- [ ] Normalización SQL funciona (205/55R16 = 20555R16)
- [ ] Filtro por marca funciona
- [ ] Ordenamiento correcto (premium primero)
- [ ] Formato precios argentino ($123.456)
- [ ] Límite de 20 productos respetado
- [ ] Mensaje WhatsApp bien formateado (Markdown)
- [ ] Sin productos: mensaje apropiado
- [ ] Auth rechaza requests sin API key (HTTP 401)
- [ ] GET endpoint devuelve documentación
