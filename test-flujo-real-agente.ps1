# Test REAL del flujo del agente n8n - Paso a paso
# Simula una conversacion completa de WhatsApp con TODAS las tablas

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST FLUJO REAL DEL AGENTE N8N" -ForegroundColor Cyan
Write-Host "Usa: leads + lead_consultas + lead_pedidos + lead_tickets" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "https://top-neum-h5x5.vercel.app"
$telefono = "+5491177889900"

Start-Sleep -Seconds 1

# ========================================
# PASO 1: Cliente dice "Hola"
# ========================================
Write-Host "`n[CONVERSACION] Cliente: 'Hola, necesito cubiertas'" -ForegroundColor Yellow
Write-Host "[AGENTE] Creando lead en tabla leads..." -ForegroundColor Gray

$body1 = @{
    telefono_whatsapp = $telefono
    nombre = "Carlos Rodriguez"
    nuevo_estado = "nuevo"
    notas = "Cliente inicia conversacion"
} | ConvertTo-Json

try {
    $resp1 = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body1
    Write-Host "OK Lead creado en tabla leads" -ForegroundColor Green
    Write-Host "   Lead ID: $($resp1.lead.id)" -ForegroundColor White
    Write-Host "   Estado: $($resp1.lead.estado)" -ForegroundColor White
    $LEAD_ID = $resp1.lead.id
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 3
Write-Host "`n⏸️  PAUSA - Revisá la base de datos antes de continuar..." -ForegroundColor Yellow
Write-Host "   Presioná ENTER para continuar al siguiente paso" -ForegroundColor Gray
Read-Host

# ========================================
# PASO 2: Cliente consulta PRIMERA medida
# ========================================
Write-Host "`n[CONVERSACION] Cliente: 'Necesito 185/65R15 Yokohama para mi Ford Ka'" -ForegroundColor Yellow
Write-Host "[AGENTE] Creando consulta en lead_consultas..." -ForegroundColor Gray

$body2 = @{
    telefono_whatsapp = $telefono
    nuevo_estado = "en_conversacion"
    tipo_vehiculo = "Ford Ka"
    medida_neumatico = "185/65R15"
    marca_preferida = "Yokohama"
    cantidad = 4
    notas = "Cliente consulta por 185/65R15 Yokohama para Ford Ka"
} | ConvertTo-Json

try {
    $resp2 = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body2
    Write-Host "OK Consulta guardada en lead_consultas" -ForegroundColor Green
    Write-Host "   Estado lead: $($resp2.lead.estado)" -ForegroundColor White
    Write-Host "   Tiene consulta: $($resp2.consulta -ne $null)" -ForegroundColor White
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Primera consulta guardada. Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 3: Agente busca productos
# ========================================
Write-Host "`n[AGENTE] Buscando productos en catalogo..." -ForegroundColor Gray

$body3 = @{
    medida_neumatico = "185/65R15"
    marca = "Yokohama"
    region = "INTERIOR"
} | ConvertTo-Json

try {
    $resp3 = Invoke-RestMethod -Uri "$baseUrl/api/productos/buscar" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body3
    Write-Host "OK Productos encontrados: $($resp3.total_encontrados)" -ForegroundColor Green
    if ($resp3.productos.Count -gt 0) {
        $producto = $resp3.productos[0]
        Write-Host "   Producto: $($producto.marca) $($producto.diseno)" -ForegroundColor White
        $SKU1 = $producto.id
        Write-Host "   SKU capturado: $SKU1" -ForegroundColor White
        $PRODUCTO1_DESC = "$($producto.marca) $($producto.diseno) $($producto.medida)"
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Producto encontrado. Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 4: Cliente consulta SEGUNDA medida (otro producto)
# ========================================
Write-Host "`n[CONVERSACION] Cliente: 'Tambien necesito 195/60R15 Hankook para mi otro auto'" -ForegroundColor Yellow
Write-Host "[AGENTE] Creando SEGUNDA consulta en lead_consultas..." -ForegroundColor Gray

$body4 = @{
    telefono_whatsapp = $telefono
    medida_neumatico = "195/60R15"
    marca_preferida = "Hankook"
    tipo_vehiculo = "Otro vehiculo"
    cantidad = 2
    notas = "Cliente tambien consulta 195/60R15 Hankook"
} | ConvertTo-Json

try {
    $resp4 = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body4
    Write-Host "OK Segunda consulta guardada" -ForegroundColor Green
    Write-Host "   El lead ahora tiene 2 consultas diferentes" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Segunda consulta guardada. Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 5: Buscar segunda medida
# ========================================
Write-Host "`n[AGENTE] Buscando segundo producto..." -ForegroundColor Gray

$body5 = @{
    medida_neumatico = "195/60R15"
    marca = "Hankook"
    region = "INTERIOR"
} | ConvertTo-Json

try {
    $resp5 = Invoke-RestMethod -Uri "$baseUrl/api/productos/buscar" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body5
    Write-Host "OK Segundo producto encontrado" -ForegroundColor Green
    if ($resp5.productos.Count -gt 0) {
        $producto2 = $resp5.productos[0]
        $SKU2 = $producto2.id
        Write-Host "   SKU capturado: $SKU2" -ForegroundColor White
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Segundo producto encontrado. Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 6: Agente cotiza
# ========================================
Write-Host "`n[AGENTE] Enviando cotizacion de AMBOS productos..." -ForegroundColor Gray

$body6 = @{
    telefono_whatsapp = $telefono
    nuevo_estado = "cotizado"
    notas = "Agente cotizo 2 productos: $PRODUCTO1_DESC x4 y segundo producto x2"
} | ConvertTo-Json

try {
    $resp6 = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body6
    Write-Host "OK Estado actualizado a cotizado" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Estado actualizado a cotizado. Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 7: Cliente confirma pedido MIXTO
# ========================================
Write-Host "`n[CONVERSACION] Cliente: 'Quiero los 4 Yokohama y los 2 Hankook en 3 cuotas'" -ForegroundColor Yellow
Write-Host "[AGENTE] Creando pedido en lead_pedidos con items_pedido..." -ForegroundColor Gray

$body7 = @{
    telefono_whatsapp = $telefono
    items_pedido = @(
        @{ sku = $SKU1; cantidad = 4 },
        @{ sku = $SKU2; cantidad = 2 }
    )
    forma_pago = "3_cuotas"
    resumen_pedido = "Cliente confirma: 4x Yokohama + 2x Hankook en 3 cuotas"
} | ConvertTo-Json -Depth 3

try {
    $resp7 = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body7
    Write-Host "OK Pedido creado en lead_pedidos!" -ForegroundColor Green
    Write-Host "   Estado: $($resp7.lead.estado)" -ForegroundColor White
    Write-Host "   Pedido ID: $($resp7.pedido.id)" -ForegroundColor White
    Write-Host "   Total items: $($resp7.pedido.items.Count)" -ForegroundColor White
    Write-Host "   Total: `$$($resp7.pedido.total)" -ForegroundColor White
    $PEDIDO_ID = $resp7.pedido.id
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host "Body enviado:" -ForegroundColor Yellow
    Write-Host $body7 -ForegroundColor Gray
    exit 1
}

Start-Sleep -Seconds 2
Write-Host "`n⏸️  PAUSA - Pedido creado! Presioná ENTER..." -ForegroundColor Yellow
Read-Host

# ========================================
# PASO 8: Cliente pide factura A (ticket)
# ========================================
Write-Host "`n[CONVERSACION] Cliente: 'Necesito factura A para mi empresa'" -ForegroundColor Yellow
Write-Host "[AGENTE] Creando ticket en lead_tickets..." -ForegroundColor Gray

$body8 = @{
    telefono_whatsapp = $telefono
    tipo = "consulta_tecnica"
    descripcion = "Cliente necesita factura A. Pedido: $PEDIDO_ID (4x Yokohama + 2x Hankook)"
    prioridad = "alta"
} | ConvertTo-Json

try {
    $resp8 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/crear" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body8
    Write-Host "OK Ticket creado en lead_tickets!" -ForegroundColor Green
    Write-Host "   Ticket ID: $($resp8.ticket_id)" -ForegroundColor White
    Write-Host "   Tipo: $($resp8.tipo)" -ForegroundColor White
    Write-Host "   Prioridad: $($resp8.prioridad)" -ForegroundColor White
    $TICKET_ID = $resp8.ticket_id
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "FLUJO COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen del flujo completo:" -ForegroundColor White
Write-Host "  1. Lead creado en tabla leads" -ForegroundColor Gray
Write-Host "  2. Primera consulta en lead_consultas (Yokohama)" -ForegroundColor Gray
Write-Host "  3. Segunda consulta en lead_consultas (Hankook)" -ForegroundColor Gray
Write-Host "  4. Pedido confirmado en lead_pedidos (2 productos)" -ForegroundColor Gray
Write-Host "  5. Ticket creado en lead_tickets (factura A)" -ForegroundColor Gray
Write-Host ""
Write-Host "Datos finales:" -ForegroundColor White
Write-Host "  Lead ID: $LEAD_ID" -ForegroundColor Cyan
Write-Host "  Pedido ID: $PEDIDO_ID" -ForegroundColor Cyan
Write-Host "  Ticket ID: $TICKET_ID" -ForegroundColor Cyan
Write-Host "  Total productos: 6 neumaticos (4 + 2)" -ForegroundColor Cyan
Write-Host ""

