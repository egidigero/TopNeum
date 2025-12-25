# Script para limpiar el lead de prueba
$telefono = "+5491177889900"
$baseUrl = "https://top-neum-h5x5.vercel.app"

Write-Host "`nBuscando lead con telefono $telefono..." -ForegroundColor Cyan

# Obtener lista de leads con POST
try {
    $bodySearch = @{} | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "$baseUrl/api/leads" -Method POST -Headers @{'Content-Type'='application/json'} -Body $bodySearch
    $leads = $result.leads
    $leadExistente = $leads | Where-Object { $_.telefono_whatsapp -eq $telefono } | Select-Object -First 1
    
    if ($leadExistente) {
        Write-Host "Lead encontrado: ID = $($leadExistente.id)" -ForegroundColor Yellow
        Write-Host "Estado actual: $($leadExistente.estado)" -ForegroundColor Gray
        
        $confirm = Read-Host "`n¿Eliminar este lead? (S/N)"
        if ($confirm -eq "S" -or $confirm -eq "s") {
            # Actualizar a estado que permita limpieza
            $body = @{
                telefono_whatsapp = $telefono
                nuevo_estado = "cancelado"
                notas = "Limpieza para testing"
            } | ConvertTo-Json
            
            $resp = Invoke-RestMethod -Uri "$baseUrl/api/n8n/actualizar-estado" -Method POST -Headers @{'Content-Type'='application/json'} -Body $body
            Write-Host "`nLead marcado como cancelado" -ForegroundColor Green
            Write-Host "Ya podes ejecutar el test nuevamente" -ForegroundColor Cyan
        }
    } else {
        Write-Host "No se encontro lead con ese telefono" -ForegroundColor Green
        Write-Host "Ya podes ejecutar el test" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
