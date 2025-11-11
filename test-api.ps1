# Test actualizar_estado endpoint

Write-Host "`n=== PASO 1: Ejecutar migración ===" -ForegroundColor Cyan
try {
    $migrationResponse = Invoke-RestMethod `
        -Uri "https://top-neum-h5x5.vercel.app/api/migrate" `
        -Method Get
    Write-Host "✅ Migración ejecutada:" -ForegroundColor Green
    Write-Host ($migrationResponse | ConvertTo-Json) -ForegroundColor Green
} catch {
    Write-Host "⚠️ Error en migración (puede ser que ya se ejecutó):" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

Write-Host "`n=== PASO 2: Test actualizar_estado ===" -ForegroundColor Cyan

$body = @{
    telefono_whatsapp = "+5491112345678"
    nuevo_estado = "conversacion_iniciada"
    tipo_vehiculo = "Gol Trend"
} | ConvertTo-Json

Write-Host "Enviando request..." -ForegroundColor Cyan
Write-Host $body -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado" `
        -Method Post `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Green
    
    # Verificar que datos_recolectados tenga tipo_vehiculo
    if ($response.datos_recolectados.tipo_vehiculo -eq "Gol Trend") {
        Write-Host "`n🎉 PERFECTO! tipo_vehiculo se guardó correctamente" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️ WARNING: tipo_vehiculo no apareció en la respuesta" -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}
