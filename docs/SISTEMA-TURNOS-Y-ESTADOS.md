# 🔄 Sistema de Turnos y Estados - TopNeum CRM

## 📋 Resumen

Este documento explica cómo funciona el sistema de tracking de leads desde WhatsApp hasta el agendamiento de turnos.

---

## 🗺️ Flujo Completo (Cliente → Turno Agendado)

```
1. 💬 WHATSAPP
   Cliente: "Hola, necesito 205/55R16"
   Bot n8n → busca productos → envía precios
   Estado: conversacion_iniciada → consulta_producto → cotizacion_enviada

2. 💳 PAGO
   Cliente: "Me interesa, pago por transferencia"
   Bot → envía CBU
   Cliente → envía comprobante
   Estado: en_proceso_de_pago
   
   ⏳ Administración verifica pago (~30 min)
   Admin → confirma en CRM
   Estado: pagado ✅

3. 🚚 ENTREGA
   Bot (se reactiva): "¿Cómo querés recibir tus neumáticos?"
   Cliente: "Colocación a domicilio en Palermo"
   Bot → envía link https://topneum.com/turnos
   Estado: turno_pendiente

4. 📅 AGENDAMIENTO (AUTOMÁTICO)
   Cliente → entra a web → agenda fecha/hora
   Sistema web → crea registro en tabla turnos con pedido_id
   🤖 TRIGGER → detecta pedido_id → busca teléfono → encuentra lead → asigna lead_id
   🤖 TRIGGER → actualiza estado lead: turno_pendiente → turno_agendado ✅

5. ✅ FINALIZADO
   Técnico → completa servicio
   Admin → marca turno como completado
   Estado: pedido_finalizado 🎉
```

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales

#### `leads` (Tabla principal del CRM WhatsApp)
```sql
id UUID PRIMARY KEY
telefono_whatsapp TEXT UNIQUE
nombre_cliente TEXT
region TEXT (CABA/INTERIOR)
estado TEXT (conversacion_iniciada, consulta_producto, ..., turno_agendado, pedido_finalizado)
whatsapp_label TEXT (sincronizado automáticamente con estado)
asignado_a UUID FK users(id)
ultima_interaccion TIMESTAMPTZ
```

#### `pedidos` (Tabla del CRM original - PRE-EXISTENTE)
```sql
id UUID PRIMARY KEY
cliente_telefono TEXT
lead_id UUID FK leads(id)  -- Agregado para unificar
... otros campos del sistema viejo ...
```

#### `lead_pedidos` (Tabla nueva del sistema WhatsApp)
```sql
id UUID PRIMARY KEY
lead_id UUID FK leads(id)
productos JSONB
forma_pago TEXT
total NUMERIC
estado_pago TEXT
```

#### `turnos` (Tabla UNIFICADA - Sirve para ambos sistemas)
```sql
id UUID PRIMARY KEY
pedido_id UUID FK pedidos(id)      -- Del sistema viejo (web agendamiento)
lead_id UUID FK leads(id)           -- Del sistema nuevo (bot WhatsApp)
tipo TEXT (colocacion/retiro/envio)
fecha DATE
hora_inicio TIME
estado TEXT (pendiente/confirmado/completado/cancelado)
```

---

## 🤖 Trigger Automático

### `auto_assign_lead_to_turno()`

**Problema que resuelve:**
- Cliente agenda turno en web → sistema solo tiene `pedido_id`
- CRM no sabe qué lead de WhatsApp corresponde al turno
- Administración debería vincular manualmente → ineficiente

**Solución automática:**
```sql
CUANDO se crea turno con pedido_id:
  1. Buscar teléfono en tabla pedidos
  2. Buscar lead con ese teléfono
  3. Asignar lead_id al turno
  4. Cambiar estado del lead: turno_pendiente → turno_agendado
```

**Código del trigger:**
```sql
CREATE TRIGGER trigger_auto_assign_lead_to_turno
  BEFORE INSERT ON turnos
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_lead_to_turno();
```

**Ubicación:** `scripts/006-trigger-auto-assign-lead-turno.sql`

---

## 📊 Estados del Lead

### Estados y Significado

| Estado | Emoji | Descripción | Quién lo actualiza |
|--------|-------|-------------|-------------------|
| `conversacion_iniciada` | 🔥 | Primer contacto | Bot n8n |
| `consulta_producto` | 💬 | Cliente preguntó medida | Bot n8n |
| `cotizacion_enviada` | 📋 | Precios enviados | Bot n8n |
| `en_proceso_de_pago` | 💳 | Esperando confirmación | Bot n8n |
| `pagado` | ✅ | Pago confirmado | **Administración** |
| `turno_pendiente` | 📅 | Falta agendar turno | Bot n8n |
| `turno_agendado` | 🗓️ | Fecha/hora confirmada | **Trigger automático** |
| `pedido_enviado` | 📦 | En camino al cliente | Administración |
| `pedido_finalizado` | 🎉 | Entrega completada | Administración |
| `abandonado` | ❌ | Cliente no respondió | Administración/Bot |

### Sincronización con WhatsApp Labels

El trigger `trigger_sync_whatsapp_label` mantiene sincronizado:

```
conversacion_iniciada/consulta_producto/cotizacion_enviada → "en caliente"
en_proceso_de_pago → "pedido en espera de pago"
pagado/turno_pendiente/turno_agendado → "pagado"
pedido_enviado/pedido_finalizado → "pedido finalizado"
```

---

## 🔗 Vinculación Lead ↔ Turno

### Caso 1: Turno desde WhatsApp (lead_id directo)
```javascript
// n8n workflow
await sql`
  INSERT INTO turnos (lead_id, tipo, fecha, hora_inicio, estado)
  VALUES (${lead_id}, 'colocacion', '2025-01-15', '10:00', 'confirmado')
`
// ✅ Ya tiene lead_id, no necesita trigger
```

### Caso 2: Turno desde Web (pedido_id → trigger → lead_id)
```javascript
// Sistema de agendamiento web
await sql`
  INSERT INTO turnos (pedido_id, tipo, fecha, hora_inicio, estado)
  VALUES (${pedido_id}, 'colocacion', '2025-01-15', '10:00', 'confirmado')
`
// 🤖 Trigger detecta pedido_id
// 🤖 Busca teléfono en pedidos
// 🤖 Encuentra lead con ese teléfono
// 🤖 Asigna lead_id automáticamente
// ✅ Turno ahora tiene lead_id
```

---

## 📱 Frontend - Vista de Pedidos

### Query Unificado

El frontend (`/app/pedidos/page.tsx`) usa esta query para mostrar todo:

```sql
SELECT 
  -- Datos del lead
  l.id as lead_id,
  l.telefono_whatsapp,
  l.nombre_cliente,
  l.region,
  l.estado as estado_lead,
  
  -- Datos del pedido
  p.id as pedido_id,
  p.productos,
  p.forma_pago,
  p.total,
  p.estado_pago,
  
  -- Datos del turno (UNIFICADO)
  t.id as turno_id,
  t.tipo as tipo_entrega,
  t.fecha as fecha_turno,
  t.hora_inicio as hora_turno,
  t.estado as estado_turno

FROM leads l
INNER JOIN lead_pedidos p ON p.lead_id = l.id
LEFT JOIN turnos t ON t.lead_id = l.id  -- ← Aquí usa lead_id asignado por trigger

WHERE l.estado IN ('pagado', 'turno_pendiente', 'turno_agendado', 'pedido_enviado', 'pedido_finalizado')
ORDER BY p.created_at DESC
```

**Resultado:** CRM puede ver todos los pedidos con sus turnos agendados, sin importar si vinieron de WhatsApp o de la web.

---

## 🧪 Testing del Sistema

### Test 1: Turno desde WhatsApp
```sql
-- 1. Crear lead
INSERT INTO leads (telefono_whatsapp, estado, region) VALUES
  ('+54 9 11 1234 5678', 'turno_pendiente', 'CABA');

-- 2. Crear pedido
INSERT INTO lead_pedidos (lead_id, productos, total) VALUES
  ((SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678'),
   '[{"marca":"Yokohama"}]'::jsonb, 120000);

-- 3. Crear turno CON lead_id
INSERT INTO turnos (lead_id, tipo, fecha, hora_inicio, estado) VALUES
  ((SELECT id FROM leads WHERE telefono_whatsapp = '+54 9 11 1234 5678'),
   'colocacion', '2025-01-15', '10:00', 'confirmado');

-- ✅ Verificar: turno tiene lead_id
```

### Test 2: Turno desde Web (con trigger)
```sql
-- 1. Crear pedido en sistema viejo
INSERT INTO pedidos (id, cliente_telefono) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', '+54 9 11 9999 8888');

-- 2. Crear lead con mismo teléfono
INSERT INTO leads (telefono_whatsapp, estado, region) VALUES
  ('+54 9 11 9999 8888', 'turno_pendiente', 'CABA');

-- 3. Crear turno SIN lead_id (solo pedido_id)
INSERT INTO turnos (pedido_id, tipo, fecha, hora_inicio, estado) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'colocacion', '2025-01-16', '11:00', 'confirmado');

-- 🤖 TRIGGER se ejecuta automáticamente

-- ✅ Verificar: turno ahora tiene lead_id y estado cambió
SELECT 
  t.lead_id,
  l.estado,
  p.cliente_telefono
FROM turnos t
JOIN leads l ON t.lead_id = l.id
JOIN pedidos p ON t.pedido_id = p.id
WHERE t.pedido_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Resultado esperado:
-- lead_id | estado          | cliente_telefono
-- uuid... | turno_agendado  | +54 9 11 9999 8888
```

---

## 🚨 Casos Edge y Soluciones

### Problema: Cliente tiene múltiples leads con mismo teléfono
**Solución:** El trigger toma el primer lead encontrado. Se recomienda tener UNIQUE constraint en `telefono_whatsapp`.

### Problema: Cliente agenda turno pero no existe como lead
**Solución:** El trigger no hace nada. Administración debe crear el lead manualmente si es necesario.

### Problema: Lead ya está en estado 'pedido_finalizado'
**Solución:** El trigger solo actualiza si está en `turno_pendiente`. No sobreescribe estados finales.

---

## 📈 Métricas y KPIs

El sistema permite tracking completo:

```sql
-- Leads por estado
SELECT estado, COUNT(*) as cantidad
FROM leads
GROUP BY estado;

-- Tasa de conversión
SELECT 
  COUNT(CASE WHEN estado = 'conversacion_iniciada' THEN 1 END) as inicios,
  COUNT(CASE WHEN estado IN ('pagado', 'turno_agendado', 'pedido_finalizado') THEN 1 END) as ventas,
  ROUND(
    COUNT(CASE WHEN estado IN ('pagado', 'turno_agendado', 'pedido_finalizado') THEN 1 END)::numeric / 
    NULLIF(COUNT(CASE WHEN estado = 'conversacion_iniciada' THEN 1 END), 0) * 100, 
    2
  ) as tasa_conversion
FROM leads;

-- Tiempo promedio hasta turno agendado
SELECT 
  AVG(
    EXTRACT(EPOCH FROM (
      SELECT updated_at FROM lead_historial 
      WHERE lead_id = l.id AND estado_nuevo = 'turno_agendado' 
      LIMIT 1
    ) - l.created_at) / 3600
  ) as horas_promedio
FROM leads l
WHERE estado = 'turno_agendado';
```

---

## 🔧 Mantenimiento

### Scripts ejecutados:
1. `001-create-schema.sql` - Schema básico
2. `005-create-leads-schema.sql` - Sistema de leads completo
3. `006-trigger-auto-assign-lead-turno.sql` - **Trigger de vinculación automática**

### Dependencias:
- PostgreSQL 14+
- Extension: uuid-ossp (para generación de UUIDs)

### Backup recomendado:
```bash
pg_dump -h <host> -U <user> -d neondb \
  -t leads -t lead_pedidos -t turnos -t lead_historial \
  > backup-leads-$(date +%Y%m%d).sql
```

---

## 📞 Soporte

Si el trigger no funciona:
1. Verificar que la columna `lead_id` existe en `turnos`
2. Verificar que `pedidos.cliente_telefono` tiene el formato correcto
3. Verificar que el lead existe con el mismo teléfono
4. Revisar logs de PostgreSQL para errores del trigger

**Contacto técnico:** [Tu email/Slack]

---

**Última actualización:** 2025-01-09
**Versión:** 1.0
