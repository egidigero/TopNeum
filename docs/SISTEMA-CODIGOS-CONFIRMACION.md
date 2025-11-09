# Sistema de Códigos de Confirmación

## 📋 Resumen

Sistema de códigos únicos de 6 caracteres alfanuméricos para identificar inequívocamente a los leads al momento de agendar turnos en la web.

**Problema resuelto:** Antes el sistema vinculaba turnos con leads usando el número de teléfono, lo cual podía fallar con múltiples leads o números duplicados. El código único garantiza identificación 100% precisa.

---

## 🎯 Características

### Código de Confirmación
- **Formato:** 6 caracteres alfanuméricos (ej: `A3X7K9`, `P4R8H3`, `M2N9V4`)
- **Caracteres usados:** A-Z (mayúsculas) y 2-9 (sin 0, O, 1, I para evitar confusión)
- **Unicidad:** UNIQUE constraint en base de datos + índice
- **Generación:** Automática al crear cada lead (trigger)
- **Visibilidad:** Cliente lo recibe por WhatsApp, Admin lo ve en CRM

### Estado de Pago en Turnos
- **`pendiente`** - Cliente agendó pero aún no confirmó pago
- **`confirmado`** - Lead tiene estado 'pagado' o 'turno_agendado'
- **`rechazado`** - (futuro) Administración rechazó el pago
- **Determinación:** Automática mediante trigger al crear turno

---

## 🗄️ Cambios en Base de Datos

### Tabla `leads`
```sql
-- Nueva columna
codigo_confirmacion VARCHAR(6) UNIQUE

-- Índice
CREATE INDEX idx_leads_codigo_confirmacion ON leads(codigo_confirmacion);
```

### Tabla `turnos`
```sql
-- Nuevas columnas
codigo_confirmacion VARCHAR(6)      -- Código ingresado al agendar
estado_pago VARCHAR(20) DEFAULT 'pendiente'  -- pendiente/confirmado/rechazado

-- Índices
CREATE INDEX idx_turnos_codigo_confirmacion ON turnos(codigo_confirmacion);
CREATE INDEX idx_turnos_estado_pago ON turnos(estado_pago);
```

### Funciones SQL

**1. Generadora de Códigos**
```sql
CREATE OR REPLACE FUNCTION generar_codigo_confirmacion() RETURNS VARCHAR(6)
```
- Genera código aleatorio de 6 caracteres
- Loop hasta encontrar código disponible (max 100 intentos)
- Usa caracteres sin confusión visual

**2. Asignación Automática**
```sql
CREATE TRIGGER trigger_asignar_codigo_confirmacion
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION asignar_codigo_confirmacion()
```
- Cada lead nuevo recibe código automáticamente
- Si `codigo_confirmacion IS NULL`, lo genera

**3. Vinculación Inteligente**
```sql
CREATE OR REPLACE FUNCTION auto_assign_lead_to_turno()
```
- **MÉTODO 1 (Preferido):** Busca lead por `codigo_confirmacion`
- **MÉTODO 2 (Fallback):** Busca por `pedido_id` + `telefono` (compatibilidad)
- Asigna `lead_id` automáticamente
- Determina `estado_pago`:
  - `'confirmado'` si lead.estado IN ('pagado', 'turno_agendado')
  - `'pendiente'` en otros casos
- Actualiza estado lead: `turno_pendiente` → `turno_agendado`

---

## 🔄 Flujo Completo

```
1. Cliente consulta por WhatsApp
   ↓
2. Bot crea lead → TRIGGER genera codigo_confirmacion = "A3X7K9"
   ↓
3. Cliente paga por transferencia
   ↓
4. Administración confirma pago → estado: 'pagado'
   ↓
5. Bot pregunta: "¿Cómo querés recibir tus neumáticos?"
   ↓
6a. Cliente: "Envío a domicilio"
    ↓
    Bot solicita: nombre, DNI, dirección, CP, teléfono, email
    ↓
    Estado: 'pendiente_envio' (NO necesita agendar turno)
    ↓
    Administración coordina envío → Empresa de logística entrega

6b. Cliente: "Retiro en sucursal" O "Colocación en sucursal"
    ↓
    Bot envía:
      "🎫 TU CÓDIGO: A3X7K9
       ⚠️ Guardalo, lo necesitas para agendar
       👉 https://topneum.com/turnos
       
       ⏰ Horarios:
       - RETIRO: Lun-Vie 9-13hs y 14-17hs
       - COLOCACIÓN: Lun-Vie 9-13hs y 14-15:30hs
       ⚠️ Colocación SOLO en sucursal (NO a domicilio)"
    ↓
7. Cliente entra a web → ingresa código "A3X7K9"
   ↓
8. Web consulta API GET /api/n8n/actualizar-estado?telefono=... 
   (busca lead por código)
   ↓
   API retorna:
   - nombre_cliente
   - telefono_whatsapp
   - region
   - tipo_entrega (retiro/colocacion)
   ↓
9. Web PRECARGA estos datos en el formulario
   Campos bloqueados (cliente NO puede cambiarlos)
   ↓
10. Cliente solo elige: fecha + horario
    ↓
11. Web crea turno con codigo_confirmacion = 'A3X7K9'
    ↓
12. TRIGGER detecta código → busca lead por codigo_confirmacion
    ↓
13. TRIGGER asigna automáticamente:
    - lead_id (vincula turno con lead correcto)
    - estado_pago = 'confirmado' (porque lead ya está pagado)
    ↓
14. TRIGGER actualiza estado: turno_pendiente → turno_agendado
    ↓
15. CRM muestra: Lead con turno agendado ✅ + Pago confirmado ✅
```

---

## 📡 API Endpoints Actualizados

### POST `/api/n8n/actualizar-estado`

**Response incluye:**
```json
{
  "success": true,
  "lead_id": "uuid-del-lead",
  "estado_anterior": "turno_pendiente",
  "estado_nuevo": "turno_agendado",
  "whatsapp_label": "pagado",
  "codigo_confirmacion": "A3X7K9",  // 🆕 Para que bot lo envíe
  "nombre_cliente": "Juan Pérez",
  "region": "CABA",
  "timestamp": "2025-01-09T..."
}
```

### GET `/api/n8n/actualizar-estado?telefono=+54...`

**Lead object incluye:**
```json
{
  "exists": true,
  "lead": {
    "id": "uuid-del-lead",
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "codigo_confirmacion": "A3X7K9",  // 🆕
    "estado": "turno_pendiente",
    ...
  }
}
```

---

## 🖥️ Frontend - Vista de Pedidos

### Query Actualizado (`app/pedidos/page.tsx`)

```sql
SELECT 
  l.codigo_confirmacion,  -- 🆕
  t.estado_pago as turno_estado_pago,  -- 🆕
  ...
FROM leads l
INNER JOIN lead_pedidos p ON p.lead_id = l.id
LEFT JOIN turnos t ON t.lead_id = l.id
```

### Tabla de Pedidos (`components/pedidos/pedidos-table.tsx`)

**Interface actualizado:**
```typescript
interface Pedido {
  // ... campos existentes ...
  codigo_confirmacion: string  // 🆕
  turno_estado_pago: string    // 🆕
}
```

**Nuevas columnas:**

1. **Columna "Código"** (después de Cliente)
   - Muestra código de confirmación en badge
   - Formato: `A3X7K9`
   - Badge gris con fuente monoespaciada

2. **Estado de Pago en "Turno"**
   - ✅ **Pago Confirmado** (verde)
   - ⏳ **A Confirmar Pago** (amarillo)
   - ❌ **Pago Rechazado** (rojo)

---

## 🎨 UI Components

### Colores de Estado de Pago

```typescript
const ESTADO_PAGO_TURNO_COLORS = {
  confirmado: "bg-green-100 text-green-700 border-green-200",
  pendiente: "bg-yellow-100 text-yellow-700 border-yellow-200",
  rechazado: "bg-red-100 text-red-700 border-red-200",
}

const ESTADO_PAGO_TURNO_LABELS = {
  confirmado: "✅ Pago Confirmado",
  pendiente: "⏳ A Confirmar Pago",
  rechazado: "❌ Pago Rechazado",
}
```

---

## 🤖 Bot de WhatsApp

### Prompt Actualizado (`docs/prompt-agente-con-tools.md`)

**Sección "4️⃣ Cliente elige forma de entrega":**

```markdown
**Acción:**
1. Cliente elige retiro, envío o colocación
2. Usar `actualizar_estado` con estado `turno_pendiente`
3. **IMPORTANTE:** Enviar código de confirmación del cliente
4. Enviar link para agendar turno (si aplica)

RESPUESTA AL CLIENTE:
"Perfecto! 📍

Colocación a domicilio en [REGIÓN].

🎫 *TU CÓDIGO DE CONFIRMACIÓN:* [CÓDIGO]
⚠️ *MUY IMPORTANTE:* Guardá este código, lo vas a necesitar para agendar tu turno.

🗓️ Agendá tu turno acá:
👉 https://topneum.com/turnos

Cuando entres a la web:
1️⃣ Ingresá tu código: [CÓDIGO]
2️⃣ Elegí fecha y horario
3️⃣ ¡Listo! Te llegará confirmación
..."

**⚠️ CRÍTICO:**
- El código de confirmación es ÚNICO para cada cliente
- Es un código de 6 caracteres (ej: A3X7K9)
- El cliente DEBE usarlo al agendar en la web
- Sin este código, el sistema no puede vincular el turno con el lead
- **Siempre resaltar el código con negritas y mencionar su importancia**
```

---

## ✅ Ventajas del Sistema

| Aspecto | ANTES (teléfono) | AHORA (código) |
|---------|------------------|----------------|
| **Identificación** | Telefono en pedidos → leads | Código único 6 chars |
| **Confiabilidad** | ⚠️ Puede fallar si múltiples leads | ✅ 100% preciso (UNIQUE) |
| **Seguridad** | Teléfono puede cambiar/duplicarse | Código permanente por lead |
| **UX Cliente** | Sin referencia visible | Código como "número de orden" |
| **Estado Pago** | No visible en turnos | ✅ Columna estado_pago |
| **Tracking Admin** | Difícil saber quién pagó | ✅ Claro en tabla pedidos |

---

## 🧪 Testing

### Test 1: Generación Automática
```sql
-- Crear lead nuevo
INSERT INTO leads (telefono_whatsapp, nombre_cliente) 
VALUES ('+54 9 11 1234 5678', 'Test Cliente');

-- Verificar código generado
SELECT id, nombre_cliente, codigo_confirmacion FROM leads WHERE nombre_cliente = 'Test Cliente';
-- Debe retornar: id | Test Cliente | A3X7K9 (ejemplo)
```

### Test 2: Vinculación por Código
```sql
-- Crear turno con código
INSERT INTO turnos (codigo_confirmacion, fecha, hora_inicio, tipo)
VALUES ('A3X7K9', '2025-01-15', '10:00', 'colocacion');

-- Verificar vinculación automática
SELECT t.id, t.lead_id, t.estado_pago, l.nombre_cliente 
FROM turnos t 
JOIN leads l ON l.id = t.lead_id
WHERE t.codigo_confirmacion = 'A3X7K9';
-- Debe retornar: turno_id | lead_id | confirmado/pendiente | Test Cliente
```

### Test 3: API Response
```bash
# Actualizar estado y obtener código
curl -X POST http://localhost:3000/api/n8n/actualizar-estado \
  -H "Content-Type: application/json" \
  -d '{"telefono": "+54 9 11 1234 5678", "estado": "pagado"}'

# Response debe incluir: "codigo_confirmacion": "A3X7K9"
```

### Test 4: Frontend Display
1. Ir a `/pedidos`
2. Verificar columna "Código" muestra código (ej: `A3X7K9`)
3. Verificar badge de estado de pago en columna "Turno"
4. Confirmar colores:
   - Verde si `confirmado`
   - Amarillo si `pendiente`

---

## 🚧 Pendiente - Página Web de Agendamiento

**Requisitos para el equipo de desarrollo web:**

### Form de Agendamiento

```typescript
interface AgendamientoForm {
  codigo_confirmacion: string  // Input principal (6 caracteres)
  // Campos PRECARGADOS desde API (bloqueados):
  nombre_cliente: string       // No editable
  telefono_whatsapp: string    // No editable
  region: string               // No editable
  tipo_entrega: string         // No editable (retiro/colocacion)
  // Campos que el cliente elige:
  fecha: Date                  // Selector de fecha
  hora_inicio: string          // Selector de hora (según tipo_entrega)
}
```

### Flujo de Validación del Código

**PASO 1: Input de Código**
1. Input debe aceptar solo 6 caracteres alfanuméricos
2. Convertir a mayúsculas automáticamente mientras escribe
3. Botón "Verificar Código" (o auto-validar al completar 6 chars)

**PASO 2: Consultar API**
```typescript
// GET /api/n8n/actualizar-estado?codigo={codigo}
// O buscar por código en endpoint existente

const response = await fetch(`/api/n8n/buscar-por-codigo?codigo=${codigo}`)
const data = await response.json()

if (data.exists) {
  // Precargar datos
  form.nombre_cliente = data.lead.nombre_cliente  // BLOQUEADO
  form.telefono_whatsapp = data.lead.telefono_whatsapp  // BLOQUEADO
  form.region = data.lead.region  // BLOQUEADO
  form.tipo_entrega = data.lead.tipo_entrega  // BLOQUEADO (retiro/colocacion)
} else {
  // Mostrar error
  alert("Código inválido o no encontrado")
}
```

**PASO 3: Mostrar Horarios Según Tipo**

```typescript
const HORARIOS = {
  retiro: {
    dias: "Lunes a Viernes",
    horarios: "9:00 a 13:00 y 14:00 a 17:00",
    slots: [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
    ]
  },
  colocacion: {
    dias: "Lunes a Viernes",
    horarios: "9:00 a 13:00 y 14:00 a 15:30",
    duracion: "1-2 horas",
    slots: [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
      "14:00", "14:30", "15:00"
    ]
  }
}

// Mostrar solo slots disponibles según tipo_entrega
const slots = HORARIOS[form.tipo_entrega].slots
```

**PASO 4: Crear Turno**

```typescript
// POST /api/turnos
const turno = {
  codigo_confirmacion: form.codigo_confirmacion,
  fecha: form.fecha,  // Formato: YYYY-MM-DD
  hora_inicio: form.hora_inicio,  // Formato: HH:MM
  tipo: form.tipo_entrega  // 'retiro' o 'colocacion'
  // NO enviar lead_id - El trigger lo asigna automáticamente
}

// El trigger auto_assign_lead_to_turno() hará:
// 1. Buscar lead por codigo_confirmacion
// 2. Asignar lead_id
// 3. Determinar estado_pago ('confirmado' si ya pagó)
// 4. Actualizar estado lead: turno_pendiente → turno_agendado
```

### UX Recomendada

```
┌─────────────────────────────────────────────────┐
│  🎫 Agendá tu Turno - TopNeum                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  PASO 1: Ingresá tu código de confirmación     │
│  ┌───────────────────────────────────────────┐ │
│  │ A 3 X 7 K 9                  [Verificar] │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ✅ Código válido                               │
│                                                 │
│  📋 Tus datos (pre-cargados):                  │
│  ┌───────────────────────────────────────────┐ │
│  │ 👤 Juan Pérez                    🔒       │ │
│  │ 📱 +54 9 11 1234 5678            🔒       │ │
│  │ 📍 CABA                          🔒       │ │
│  │ 🔧 Colocación en sucursal        🔒       │ │
│  └───────────────────────────────────────────┘ │
│  ℹ️ Estos datos no se pueden modificar         │
│                                                 │
│  PASO 2: Elegí fecha y horario                 │
│  📅 Fecha:                                     │
│  [Calendario - solo Lun-Vie]                   │
│                                                 │
│  ⏰ Horario disponible:                        │
│  Lunes a Viernes: 9:00 a 13:00 y 14:00 a 15:30│
│  ⚠️ Duración del servicio: 1-2 horas          │
│                                                 │
│  [09:00] [09:30] [10:00] [10:30] [11:00] ...  │
│                                                 │
│  📍 Ubicación:                                 │
│  VW Maynar AG - Villa Devoto                   │
│  [Ver en Google Maps]                          │
│                                                 │
│  ✅ Incluye:                                   │
│  • Colocación de neumáticos                   │
│  • Balanceo                                    │
│  • Alineación                                  │
│  • Disposición de cubiertas viejas            │
│                                                 │
│  [Confirmar Turno]                             │
│                                                 │
└─────────────────────────────────────────────────┘

Confirmación:
┌─────────────────────────────────────────────────┐
│  ✅ ¡Turno Confirmado!                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  📅 Viernes 15 de Enero - 10:00hs             │
│  🔧 Colocación en sucursal                     │
│  📍 VW Maynar AG - Villa Devoto                │
│                                                 │
│  🎫 Tu código: A3X7K9                         │
│                                                 │
│  📋 No olvides traer:                          │
│  • Tu DNI                                      │
│  • Tu vehículo                                 │
│  • Este código: A3X7K9                        │
│                                                 │
│  📧 Te enviamos confirmación por email/SMS     │
│                                                 │
│  [Descargar Comprobante] [Volver al Inicio]   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Validaciones Importantes

1. **Campos Bloqueados:**
   - `nombre_cliente`, `telefono_whatsapp`, `region`, `tipo_entrega`
   - Mostrar con ícono de candado 🔒
   - Deshabilitar edición: `disabled={true}` en inputs
   - Mensaje: "Estos datos no se pueden modificar"

2. **Calendario:**
   - Solo Lunes a Viernes habilitados
   - Deshabilitar días pasados
   - Deshabilitar feriados (opcional, lista configurable)
   - Mínimo: mañana (no permitir mismo día)

3. **Horarios:**
   - Mostrar solo slots según `tipo_entrega`
   - Si es colocación: hasta 15:00 (servicio dura 1-2hs, cierra 15:30)
   - Si es retiro: hasta 16:30 (cierra 17:00)
   - Deshabilitar slots ya ocupados (consultar disponibilidad)

4. **Mensajes de Error:**
   - Código inválido: "El código ingresado no existe. Verificá que lo hayas copiado correctamente."
   - Código ya usado: "Este código ya tiene un turno agendado. Contactá a soporte si necesitás modificarlo."
   - Sin disponibilidad: "No hay turnos disponibles para esta fecha. Elegí otra fecha."

### API Endpoint Necesario (crear nuevo)

```typescript
// GET /api/turnos/buscar-por-codigo?codigo=A3X7K9
// Retorna datos del lead para precargar formulario

Response:
{
  "exists": true,
  "lead": {
    "id": "uuid...",
    "codigo_confirmacion": "A3X7K9",
    "nombre_cliente": "Juan Pérez",
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "region": "CABA",
    "tipo_entrega": "colocacion",  // retiro/colocacion/envio
    "estado": "turno_pendiente",
    "turno_existente": null  // o datos del turno si ya agendó
  }
}

// Si turno_existente !== null, mostrar:
// "Ya tenés un turno agendado para el [FECHA] a las [HORA]"
// "¿Querés modificarlo?"
```

### Creación del Turno (SQL)

```sql
-- El frontend solo debe insertar estos datos:
INSERT INTO turnos (
  codigo_confirmacion,
  fecha, 
  hora_inicio, 
  tipo
) VALUES ($1, $2, $3, $4)

-- El trigger auto_assign_lead_to_turno() se encarga de:
-- 1. Asignar lead_id (busca por codigo_confirmacion)
-- 2. Asignar estado_pago ('confirmado' o 'pendiente')
-- 3. Actualizar estado del lead: turno_pendiente → turno_agendado
```

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

1. **Tasa de Vinculación Exitosa**
   ```sql
   -- Turnos vinculados correctamente
   SELECT 
     COUNT(*) FILTER (WHERE lead_id IS NOT NULL) * 100.0 / COUNT(*) as tasa_vinculacion
   FROM turnos;
   -- Meta: >98%
   ```

2. **Claridad de Estado de Pago**
   ```sql
   -- Distribución de estados de pago
   SELECT 
     estado_pago, 
     COUNT(*) as cantidad
   FROM turnos
   GROUP BY estado_pago;
   ```

3. **Uso del Sistema**
   ```sql
   -- Leads con código generado
   SELECT COUNT(*) FROM leads WHERE codigo_confirmacion IS NOT NULL;
   -- Meta: 100%
   ```

---

## 🔧 Troubleshooting

### Problema: Lead sin código
```sql
-- Solución: Generar código manualmente
UPDATE leads 
SET codigo_confirmacion = generar_codigo_confirmacion() 
WHERE id = 'uuid-del-lead';
```

### Problema: Turno no se vinculó
```sql
-- Verificar si existe código en leads
SELECT * FROM leads WHERE codigo_confirmacion = 'A3X7K9';

-- Si existe, vincular manualmente
UPDATE turnos 
SET lead_id = (SELECT id FROM leads WHERE codigo_confirmacion = 'A3X7K9')
WHERE codigo_confirmacion = 'A3X7K9';
```

### Problema: Estado de pago incorrecto
```sql
-- Actualizar estado de pago según estado del lead
UPDATE turnos t
SET estado_pago = CASE 
  WHEN l.estado IN ('pagado', 'turno_agendado') THEN 'confirmado'
  ELSE 'pendiente'
END
FROM leads l
WHERE t.lead_id = l.id AND t.id = 'uuid-del-turno';
```

---

## 📝 Notas Adicionales

### Seguridad
- Código NO es sensible (no es contraseña)
- Solo identifica al lead, no da acceso a modificar datos
- Puede compartirse libremente por WhatsApp

### Escalabilidad
- 36 caracteres disponibles (A-Z sin O,I + 2-9)
- Capacidad: 36^6 = 2.176.782.336 códigos únicos
- Suficiente para años de operación

### Backward Compatibility
- Sistema viejo (sin código) sigue funcionando
- Trigger tiene fallback por teléfono
- Todos los leads existentes recibieron código (backfill)

---

## 📅 Implementación Completada

**Fecha:** 09/01/2025

**Componentes Actualizados:**
- ✅ Base de datos (6 statements SQL)
- ✅ API endpoints (2 routes)
- ✅ Frontend queries (1 file)
- ✅ Frontend UI (1 component)
- ✅ Bot prompt (1 document)

**Status:** Sistema funcional end-to-end desde base de datos hasta interfaz de administración.

**Pendiente:** Página web de agendamiento que acepte código (desarrollo externo).
