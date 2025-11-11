# Test actualizar_estado endpoint

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
