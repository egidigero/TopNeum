# Memoria del Chat - Documentación

## Objetivo
Mantener contexto de conversaciones con leads sin almacenar mensajes completos, optimizando para LLMs con ventanas de contexto limitadas.

## Estrategia actual

### Campo `leads.notas`
- **Tipo:** `text` (sin límite estricto, pero recomendar < 2000 caracteres)
- **Propósito:** Resumen ejecutivo de la conversación
- **Formato recomendado:**
  ```
  [YYYY-MM-DD HH:mm] - Consulta inicial: 205/55 R16 para Fiat Cronos
  [YYYY-MM-DD HH:mm] - Cotización enviada: 4 neumáticos Michelin Energy, ARS 450.000 contado
  [YYYY-MM-DD HH:mm] - Cliente pregunta por envío a Rosario
  [YYYY-MM-DD HH:mm] - Turno agendado para 2025-11-20 10:00
  ```

### Reglas de actualización
1. **Agregar entrada nueva** cada vez que hay interacción significativa (consulta, cotización, cambio de estado)
2. **Limitar a últimas 5-7 interacciones** para mantener < 2000 chars
3. **Actualizar `leads.ultima_interaccion`** con timestamp
4. **NO almacenar:**
   - Mensajes completos del cliente
   - Información sensible (DNI, dirección) → va a `turnos`
   - Chit-chat sin valor para el funnel

### TTL y limpieza
- No hay TTL automático en `notas`
- Cuando un lead pasa a `pedido_confirmado` o `perdido`, mantener notas por 30 días y luego archivar/limpiar
- Script recomendado: `scripts/cleanup-old-leads.sql` (crear si no existe)

## Integración con el agente (nn8n/AI)

### Flujo de lectura
1. Al iniciar conversación, el agente consulta:
   ```sql
   SELECT id, nombre_cliente, telefono_whatsapp, estado, notas, ultima_interaccion
   FROM leads
   WHERE telefono_whatsapp = '...'
   ```
2. Parse `notas` para extraer contexto relevante
3. Usar como "memoria de corto plazo" en el prompt del LLM

### Flujo de escritura
1. Después de cada interacción significativa, agregar línea a `notas`:
   ```typescript
   const nuevaLinea = `[${new Date().toISOString().slice(0,16).replace('T',' ')}] - ${resumen}`
   const notasActualizadas = lead.notas 
     ? `${lead.notas}\n${nuevaLinea}` 
     : nuevaLinea
   
   await sql`
     UPDATE leads 
     SET notas = ${notasActualizadas}, ultima_interaccion = NOW()
     WHERE id = ${leadId}
   `
   ```
2. Si `notas.length > 2000`, eliminar las líneas más antiguas

## Ejemplo de notas bien formadas
```
[2025-11-15 14:30] - Consulta: 205/55 R16, uso diario, prefiere Michelin
[2025-11-15 14:35] - Cotización: Michelin Energy XM2+ $112k c/u, total $448k contado
[2025-11-15 16:20] - Cliente pregunta por financiación
[2025-11-15 16:22] - Enviada opción 3 cuotas: $470k total
[2025-11-16 10:00] - Cliente confirma, agenda turno para colocación 2025-11-18
```

## Alternativas consideradas

### Opción A: Tabla `lead_mensajes` completa
❌ **Descartada** - Almacenamiento innecesario, difícil de consultar para LLM

### Opción B: Usar vector embeddings
⏸️ **En pausa** - Overkill para el volumen actual, considerar si > 10k leads/mes

### Opción C: Resumen LLM automático
✅ **Recomendado** - Implementar script que cada noche resuma conversaciones del día con LLM y actualice `notas`

## Métricas a monitorear
- Tamaño promedio de `notas` por lead
- % de leads con notas > 2000 chars
- Tiempo de respuesta del agente (verificar si cargar notas causa latencia)

## Próximos pasos
1. Crear endpoint `GET /api/leads/[id]/summary` que devuelva notas parseadas
2. Implementar limpieza automática de leads antiguos
3. Añadir UI para que vendedores editen manualmente notas si es necesario
