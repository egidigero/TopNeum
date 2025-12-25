# Test completo de las 3 TOOLS del agente n8n
# Simula el flujo real que haría el agente

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST DE TOOLS DEL AGENTE N8N" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "https://top-neum-h5x5.vercel.app"

# PASO 1: BUSCAR PRODUCTOS (Tool: buscar_productos)
Write-Host "`n[PASO 1] Cliente pregunta: 'Necesito cubiertas 185/65R15 Yokohama'" -ForegroundColor Yellow
Write-Host "Tool usada: buscar_productos" -ForegroundColor Gray

$body1 = @{
    medida_neumatico = "185/65R15"
    marca = "Yokohama"
    region = "INTERIOR"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/productos/buscar" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body1
    
    Write-Host "✓ Productos encontrados: $($response1.productos.Count)" -ForegroundColor Green
    if ($response1.productos.Count -gt 0) {
        $primerProducto = $response1.productos[0]
        Write-Host "  - $($primerProducto.marca) $($primerProducto.familia) $($primerProducto.diseno)" -ForegroundColor White
        Write-Host "  - SKU: $($primerProducto.codigo)" -ForegroundColor White
        Write-Host "  - Precio INTERIOR: `$$($primerProducto.efectivo_interior_sin_iva)" -ForegroundColor White
        $SKU_SELECCIONADO = $primerProducto.codigo
    }
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

# PASO 2: CREAR LEAD Y CONSULTA
Write-Host "`n[PASO 2] Agente registra la consulta del cliente" -ForegroundColor Yellow
Write-Host "Tool usada: actualizar-estado" -ForegroundColor Gray

$body2 = @{
    telefono_whatsapp = "+5491166778899"
    nombre = "Juan Testing"
    medida_neumatico = "185/65R15"
    marca_preferida = "Yokohama"
    tipo_vehiculo = "Ford Ka"
    cantidad = 4
    notas = "Cliente pregunto por 185/65R15 Yokohama"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/leads/actualizar" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body2
    
    Write-Host "✓ Lead creado: $($response2.lead_id)" -ForegroundColor Green
    Write-Host "  - Nombre: $($response2.nombre)" -ForegroundColor White
    Write-Host "  - Estado: $($response2.estado)" -ForegroundColor White
    
    $LEAD_ID = $response2.lead_id
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    Write-Host "Body enviado:" -ForegroundColor Yellow
    Write-Host $body2 -ForegroundColor Gray
    exit 1
}

# PASO 3: CONFIRMAR PEDIDO CON SKU
Write-Host "`n[PASO 3] Cliente confirma pedido en 3 cuotas" -ForegroundColor Yellow
Write-Host "Tool usada: actualizar-estado" -ForegroundColor Gray

$body3 = @{
    telefono_whatsapp = "+5491166778899"
    nuevo_estado = "pedido_confirmado"
    producto_descripcion = "4x Yokohama BLUEARTH ES32 185/65R15"
    forma_pago_detalle = "3 cuotas sin interes"
    cantidad = 4
    notas = "Cliente confirma: 4 neumaticos Yokohama 185/65R15 en 3 cuotas. SKU: $SKU_SELECCIONADO"
} | ConvertTo-Json -Depth 3

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/api/leads/actualizar" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body3
    
    Write-Host "✓ Pedido confirmado!" -ForegroundColor Green
    Write-Host "  - Estado lead: $($response3.estado)" -ForegroundColor White
    Write-Host "  - Producto: $($response3.producto_descripcion)" -ForegroundColor White
    Write-Host "  - Forma pago: $($response3.forma_pago_detalle)" -ForegroundColor White
    
    $LEAD_ID = $response3.lead_id
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

# PASO 4: CREAR TICKET
Write-Host "`n[PASO 4] Cliente pregunta algo especial" -ForegroundColor Yellow
Write-Host "Tool usada: crear_ticket" -ForegroundColor Gray

$body4 = @{
    telefono_whatsapp = "+5491166778899"
    tipo = "consulta_tecnica"
    descripcion = "Cliente necesita factura A para empresa. Lead ID: $LEAD_ID"
    prioridad = "media"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "$baseUrl/api/tickets/crear" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body4
    
    Write-Host "✓ Ticket creado: $($response4.ticket_id)" -ForegroundColor Green
    Write-Host "  - Tipo: $($response4.tipo)" -ForegroundColor White
    Write-Host "  - Prioridad: $($response4.prioridad)" -ForegroundColor White
    Write-Host "  - Estado: $($response4.estado)" -ForegroundColor White
    
    $TICKET_ID = $response4.ticket_id
} catch {
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
}

# RESUMEN FINAL
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "COMPLETADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Lead ID: $LEAD_ID" -ForegroundColor White
Write-Host "Ticket ID: $TICKET_ID" -ForegroundColor White
Write-Host ""
