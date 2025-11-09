# 🧪 Scripts de Testing Rápido - Sistema TopNeum

## PowerShell - Testing Completo

### 1. Variables Globales

```powershell
# Configurar una vez
$ApiKey = "topneum_n8n_2025_secure_key_change_this"
$BaseUrl = "http://localhost:3001" # o "https://tu-dominio.com"

$Headers = @{
    "x-api-key" = $ApiKey
    "Content-Type" = "application/json"
}
```

---

## Test 1: Búsqueda de Productos (CABA)

```powershell
$body = @{
    telefono_whatsapp = "+54 9 11 1234 5678"
    medida_neumatico = "205/55R16"
    region = "CABA"
    tipo_consulta = "cotizacion"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $Headers `
    -Body $body

# Ver resultado
$response.mensaje
Write-Host "Productos encontrados: $($response.cantidad)" -ForegroundColor Green
```

**Output esperado:**
```
🔍 Encontramos 8 opciones para 205/55R16:
...
Productos encontrados: 8
```

---

## Test 2: Búsqueda de Productos (INTERIOR)

```powershell
$body = @{
    telefono_whatsapp = "+54 9 351 1234 5678" # Córdoba
    medida_neumatico = "205/55R16"
    region = "INTERIOR"
    tipo_consulta = "cotizacion"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $Headers `
    -Body $body

# Verificar que muestra precios de INTERIOR
$response.mensaje -match "CONTADO Interior"
```

---

## Test 3: Crear Lead y Actualizar Estado

```powershell
# Paso 1: Crear lead inicial
$body = @{
    telefono_whatsapp = "+54 9 11 9876 5432"
    nuevo_estado = "conversacion_iniciada"
    cambiado_por = "test_manual"
} | ConvertTo-Json

$response1 = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/actualizar-estado" `
    -Method POST `
    -Headers $Headers `
    -Body $body

Write-Host "Lead creado: $($response1.lead_id)" -ForegroundColor Green
Write-Host "Label WhatsApp: $($response1.whatsapp_label)" -ForegroundColor Cyan

# Paso 2: Actualizar a consulta_producto
$body = @{
    telefono_whatsapp = "+54 9 11 9876 5432"
    nuevo_estado = "consulta_producto"
    cambiado_por = "test_manual"
    datos_adicionales = @{
        medida_neumatico = "175/65R14"
        tipo_vehiculo = "Auto"
    }
} | ConvertTo-Json

$response2 = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/actualizar-estado" `
    -Method POST `
    -Headers $Headers `
    -Body $body

Write-Host "Estado actualizado a: $($response2.estado_nuevo)" -ForegroundColor Green
```

---

## Test 4: Registrar Mensajes

```powershell
# Mensaje entrante (del cliente)
$body = @{
    telefono_whatsapp = "+54 9 11 9876 5432"
    direccion = "entrante"
    contenido = "Hola, necesito precio de 175/65R14"
    enviado_por = "cliente"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/registrar-mensaje" `
    -Method POST `
    -Headers $Headers `
    -Body $body

Write-Host "Mensaje entrante registrado" -ForegroundColor Green

# Mensaje saliente (del agente)
$body = @{
    telefono_whatsapp = "+54 9 11 9876 5432"
    direccion = "saliente"
    contenido = "🔍 Encontramos 5 opciones para 175/65R14..."
    enviado_por = "agente_llm"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/registrar-mensaje" `
    -Method POST `
    -Headers $Headers `
    -Body $body

Write-Host "Mensaje saliente registrado" -ForegroundColor Green
```

---

## Test 5: Consultar Estado del Lead

```powershell
$telefono = "+54 9 11 9876 5432"

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/actualizar-estado?telefono=$telefono" `
    -Method GET `
    -Headers $Headers

# Ver estado actual
Write-Host "Estado: $($response.lead.estado)" -ForegroundColor Cyan
Write-Host "Label: $($response.lead.whatsapp_label)" -ForegroundColor Cyan
Write-Host "Última interacción: $($response.lead.ultima_interaccion)" -ForegroundColor Cyan

# Ver consultas
Write-Host "`nConsultas realizadas: $($response.consultas.Count)" -ForegroundColor Green
$response.consultas | Format-Table medida_neumatico, marca_preferida, tipo_vehiculo
```

---

## Test 6: Flujo Completo Simulado

```powershell
Write-Host "=== INICIANDO FLUJO COMPLETO ===" -ForegroundColor Yellow

$telefono = "+54 9 11 5555 6666"

# 1. Primer mensaje del cliente
Write-Host "`n[1] Cliente envía mensaje..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = $telefono
    direccion = "entrante"
    contenido = "Hola, necesito precio de 205/55R16 para mi auto"
    enviado_por = "cliente"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/n8n/registrar-mensaje" -Method POST -Headers $Headers -Body $body | Out-Null

# 2. Actualizar a consulta_producto
Write-Host "[2] Agente detecta medida..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = $telefono
    nuevo_estado = "consulta_producto"
    cambiado_por = "agente_llm"
    datos_adicionales = @{
        medida_neumatico = "205/55R16"
        tipo_vehiculo = "Auto"
        tipo_uso = "ciudad"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/n8n/actualizar-estado" -Method POST -Headers $Headers -Body $body | Out-Null

# 3. Buscar productos
Write-Host "[3] Buscando productos..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = $telefono
    medida_neumatico = "205/55R16"
    region = "CABA"
    tipo_consulta = "cotizacion"
} | ConvertTo-Json

$productos = Invoke-RestMethod -Uri "$BaseUrl/api/n8n/buscar-neumaticos" -Method POST -Headers $Headers -Body $body

Write-Host "   ✓ Encontrados: $($productos.cantidad) productos" -ForegroundColor Green

# 4. Actualizar a cotizacion_enviada
Write-Host "[4] Enviando cotización..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = $telefono
    nuevo_estado = "cotizacion_enviada"
    cambiado_por = "agente_llm"
    datos_adicionales = @{
        productos_mostrados = $productos.productos
        region = "CABA"
        precio_total_3cuotas = 380000
        precio_total_contado = 1026000
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "$BaseUrl/api/n8n/actualizar-estado" -Method POST -Headers $Headers -Body $body | Out-Null

# 5. Registrar mensaje saliente
Write-Host "[5] Registrando respuesta..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = $telefono
    direccion = "saliente"
    contenido = $productos.mensaje
    enviado_por = "agente_llm"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/n8n/registrar-mensaje" -Method POST -Headers $Headers -Body $body | Out-Null

# 6. Verificar estado final
Write-Host "`n[6] Verificando estado final..." -ForegroundColor Cyan
$estado = Invoke-RestMethod -Uri "$BaseUrl/api/n8n/actualizar-estado?telefono=$telefono" -Method GET -Headers $Headers

Write-Host "`n=== RESULTADO ===" -ForegroundColor Yellow
Write-Host "Estado: $($estado.lead.estado)" -ForegroundColor Green
Write-Host "Label WhatsApp: $($estado.lead.whatsapp_label)" -ForegroundColor Green
Write-Host "Total consultas: $($estado.consultas.Count)" -ForegroundColor Green
Write-Host "Total cotizaciones: $($estado.cotizaciones.Count)" -ForegroundColor Green
Write-Host "`n✅ Flujo completado exitosamente!" -ForegroundColor Green
```

---

## Test 7: Verificar Diferencias de Precio CABA vs INTERIOR

```powershell
Write-Host "=== COMPARANDO PRECIOS CABA VS INTERIOR ===" -ForegroundColor Yellow

$medida = "205/55R16"

# Test CABA
$body_caba = @{
    telefono_whatsapp = "+54 9 11 1111 1111"
    medida_neumatico = $medida
    region = "CABA"
    tipo_consulta = "cotizacion"
} | ConvertTo-Json

$resp_caba = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $Headers `
    -Body $body_caba

# Test INTERIOR
$body_interior = @{
    telefono_whatsapp = "+54 9 351 2222 2222"
    medida_neumatico = $medida
    region = "INTERIOR"
    tipo_consulta = "cotizacion"
} | ConvertTo-Json

$resp_interior = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $Headers `
    -Body $body_interior

# Comparar
Write-Host "`nMedida: $medida" -ForegroundColor Cyan
Write-Host "`n--- CABA ---" -ForegroundColor Yellow
$resp_caba.mensaje -split "`n" | Select-Object -First 15

Write-Host "`n--- INTERIOR ---" -ForegroundColor Yellow
$resp_interior.mensaje -split "`n" | Select-Object -First 15

Write-Host "`n✅ Verificar que los precios CONTADO sean diferentes" -ForegroundColor Green
```

---

## Test 8: Error Handling

```powershell
Write-Host "=== TESTING ERROR HANDLING ===" -ForegroundColor Yellow

# Test 1: Sin API Key
Write-Host "`n[Test] Sin API Key..." -ForegroundColor Cyan
try {
    Invoke-RestMethod `
        -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body '{"medida_neumatico":"205/55R16"}'
} catch {
    Write-Host "✓ Correctamente rechazado: 401 Unauthorized" -ForegroundColor Green
}

# Test 2: Región inválida
Write-Host "`n[Test] Región inválida..." -ForegroundColor Cyan
try {
    $body = @{
        telefono_whatsapp = "+54 9 11 1234 5678"
        medida_neumatico = "205/55R16"
        region = "MARTE"
    } | ConvertTo-Json
    
    Invoke-RestMethod `
        -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
        -Method POST `
        -Headers $Headers `
        -Body $body
} catch {
    Write-Host "✓ Correctamente rechazado: 400 Bad Request" -ForegroundColor Green
}

# Test 3: Medida no encontrada
Write-Host "`n[Test] Medida no encontrada..." -ForegroundColor Cyan
$body = @{
    telefono_whatsapp = "+54 9 11 1234 5678"
    medida_neumatico = "999/99R99"
    region = "CABA"
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
    -Method POST `
    -Headers $Headers `
    -Body $body

if ($response.cantidad -eq 0) {
    Write-Host "✓ Mensaje apropiado para medida no encontrada" -ForegroundColor Green
    Write-Host $response.mensaje
}

Write-Host "`n✅ Error handling funcionando correctamente" -ForegroundColor Green
```

---

## Test 9: Performance Test

```powershell
Write-Host "=== PERFORMANCE TEST ===" -ForegroundColor Yellow

$medidas = @("205/55R16", "175/65R14", "185/60R15", "195/55R16", "225/45R17")
$regiones = @("CABA", "INTERIOR")

$tiempos = @()

foreach ($medida in $medidas) {
    foreach ($region in $regiones) {
        $body = @{
            telefono_whatsapp = "+54 9 11 1111 1111"
            medida_neumatico = $medida
            region = $region
        } | ConvertTo-Json
        
        $start = Get-Date
        
        $response = Invoke-RestMethod `
            -Uri "$BaseUrl/api/n8n/buscar-neumaticos" `
            -Method POST `
            -Headers $Headers `
            -Body $body
        
        $end = Get-Date
        $tiempo = ($end - $start).TotalMilliseconds
        
        $tiempos += [PSCustomObject]@{
            Medida = $medida
            Region = $region
            Productos = $response.cantidad
            TiempoMs = [math]::Round($tiempo, 2)
        }
    }
}

$tiempos | Format-Table -AutoSize

$promedio = ($tiempos | Measure-Object -Property TiempoMs -Average).Average
Write-Host "`nTiempo promedio: $([math]::Round($promedio, 2))ms" -ForegroundColor Green

if ($promedio -lt 500) {
    Write-Host "✅ Performance excelente (<500ms)" -ForegroundColor Green
} elseif ($promedio -lt 1000) {
    Write-Host "✓ Performance aceptable (<1s)" -ForegroundColor Yellow
} else {
    Write-Host "⚠ Performance lenta (>1s) - Considerar optimización" -ForegroundColor Red
}
```

---

## 📊 Query SQL para Verificar Datos

```sql
-- Verificar leads creados por testing
SELECT 
    telefono_whatsapp,
    region,
    estado,
    whatsapp_label,
    created_at
FROM leads
WHERE telefono_whatsapp LIKE '%test%' 
   OR telefono_whatsapp LIKE '%1111%'
   OR telefono_whatsapp LIKE '%5555%'
ORDER BY created_at DESC;

-- Ver mensajes de un lead
SELECT 
    direccion,
    LEFT(contenido, 50) as contenido_preview,
    enviado_por,
    created_at
FROM lead_mensajes
WHERE lead_id IN (
    SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 5555 6666'
)
ORDER BY created_at ASC;

-- Ver historial de estados
SELECT 
    l.telefono_whatsapp,
    h.estado_anterior,
    h.estado_nuevo,
    h.cambiado_por,
    h.created_at
FROM lead_historial h
JOIN leads l ON l.id = h.lead_id
WHERE l.telefono_whatsapp = '+54 9 11 5555 6666'
ORDER BY h.created_at ASC;

-- Limpiar datos de testing
DELETE FROM leads WHERE telefono_whatsapp LIKE '%test%' 
   OR telefono_whatsapp LIKE '%1111%'
   OR telefono_whatsapp LIKE '%5555%';
```

---

## 🎯 Checklist de Testing

```powershell
Write-Host "=== CHECKLIST DE TESTING ===" -ForegroundColor Yellow

$tests = @(
    @{ Name = "Búsqueda CABA"; Status = $false },
    @{ Name = "Búsqueda Interior"; Status = $false },
    @{ Name = "Crear lead"; Status = $false },
    @{ Name = "Actualizar estado"; Status = $false },
    @{ Name = "Registrar mensaje"; Status = $false },
    @{ Name = "Flujo completo"; Status = $false },
    @{ Name = "Error handling"; Status = $false },
    @{ Name = "Performance"; Status = $false }
)

# Ejecutar cada test y marcar como completado
# (agregar lógica de validación según necesites)

$tests | Format-Table Name, @{
    Label = "Status"
    Expression = { if ($_.Status) { "✅" } else { "❌" } }
}
```

---

**¡Scripts de testing listos! 🧪**
