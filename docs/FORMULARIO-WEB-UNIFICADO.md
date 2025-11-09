# 🌐 Formulario Web Unificado - TopNeum

## Cambio Estratégico: Todo a través de la Web

**ANTES:**
- Envío: Solicitar datos por WhatsApp ❌
- Retiro/Colocación: Web con código ✅

**AHORA:**
- **TODOS** los tipos de entrega usan código + web ✅

---

## ✅ Beneficios

1. **UX Consistente** - Misma experiencia para todos
2. **Menos Fricción** - No escribir datos largos por WhatsApp
3. **Validación Automática** - Campos con formato correcto
4. **Menos Errores** - Formulario guía al usuario
5. **Más Profesional** - Plataforma unificada
6. **Tracking Completo** - Todo en base de datos estructurada

---

## 🤖 Prompt del Bot Actualizado

### Para TODOS los Tipos de Entrega

**Bot SIEMPRE envía:**
1. Código de confirmación (6 caracteres)
2. Link: https://topneum.com/turnos
3. Estado: `turno_pendiente`

---

### 📦 ENVÍO A DOMICILIO (Nuevo Flujo)

```
Cliente: "Lo quiero por envío"

BOT RESPONDE:
"Perfecto! 🚚 Envío GRATIS a todo el país ✅

🎫 *TU CÓDIGO DE CONFIRMACIÓN:* A3X7K9

⚠️ *MUY IMPORTANTE:* Guardá este código, lo necesitás para registrar tu envío.

📦 Completá tus datos de envío acá:
👉 https://topneum.com/turnos

Cuando entres a la web:
1️⃣ Ingresá tu código: *A3X7K9*
2️⃣ Se cargarán tus datos automáticamente
3️⃣ Completá dirección de entrega
4️⃣ ¡Listo! Te contactaremos para coordinar

⏱️ Tiempo estimado de entrega: 5-7 días hábiles

📋 Datos que necesitaremos en la web:
• Dirección completa de entrega
• DNI del destinatario
• Código Postal
• Email de contacto

¿Alguna duda? 😊"
```

---

### 🏪 RETIRO EN SUCURSAL

```
Cliente: "Paso a retirar"

BOT RESPONDE:
"Perfecto! 🏪 Retiro en sucursal - Villa Devoto

🎫 *TU CÓDIGO DE CONFIRMACIÓN:* A3X7K9

⚠️ *MUY IMPORTANTE:* Guardá este código.

🗓️ Agendá tu turno acá:
👉 https://topneum.com/turnos

📍 Dirección: VW Maynar AG - Villa Devoto
⏰ Horarios: Lun-Vie 9-13hs y 14-17hs

Cuando entres:
1️⃣ Ingresá código: *A3X7K9*
2️⃣ Elegí fecha y horario
3️⃣ ¡Confirmación lista!

📋 Traé: DNI + código

¿Dudas? 😊"
```

---

### 🔧 COLOCACIÓN EN SUCURSAL

```
Cliente: "Quiero la colocación"

BOT RESPONDE:
"Perfecto! 🔧 Colocación BONIFICADA en sucursal

🎫 *TU CÓDIGO:* A3X7K9

⚠️ Guardá este código.

🗓️ Agendá acá:
👉 https://topneum.com/turnos

📍 VW Maynar AG - Villa Devoto
⏰ Lun-Vie 9-13hs y 14-15:30hs

⚠️ IMPORTANTE: Solo en sucursal, NO a domicilio.

1️⃣ Ingresá código: *A3X7K9*
2️⃣ Elegí fecha y hora
3️⃣ ¡Listo!

✅ Incluye: colocación + balanceo + alineación + disposición

⏱️ Duración: 1-2 horas

📋 Traé: vehículo + código

¿Dudas? 😊"
```

---

## 🌐 Página Web: `/turnos`

### Paso 1: Ingreso de Código

```
┌────────────────────────────────────────┐
│  🎫 Ingresá tu Código - TopNeum       │
├────────────────────────────────────────┤
│                                        │
│  [ A 3 X 7 K 9 ]   [Verificar]        │
│                                        │
└────────────────────────────────────────┘
```

API Call:
```
GET /api/turnos/buscar-por-codigo?codigo=A3X7K9

Response:
{
  "exists": true,
  "lead": {
    "codigo_confirmacion": "A3X7K9",
    "nombre_cliente": "Juan Pérez",
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "region": "CABA",
    "tipo_entrega": "envio"  // 🔑 KEY: Define qué formulario mostrar
  }
}
```

---

### Paso 2a: Formulario ENVÍO (si tipo_entrega = "envio")

```
┌────────────────────────────────────────┐
│  📦 Datos de Envío                    │
├────────────────────────────────────────┤
│  ✅ Código válido: A3X7K9             │
│                                        │
│  📋 Tus datos (pre-cargados):         │
│  ┌──────────────────────────────────┐ │
│  │ 👤 Juan Pérez            🔒     │ │
│  │ 📱 +54 9 11...           🔒     │ │
│  │ 📍 CABA                  🔒     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  📦 Completá datos de envío:          │
│                                        │
│  Nombre destinatario: *               │
│  [ Juan Pérez                    ]   │
│                                        │
│  DNI: *                                │
│  [ 12345678                      ]   │
│                                        │
│  Calle: *                              │
│  [ Av. Corrientes                ]   │
│                                        │
│  Altura: *                             │
│  [ 1234                          ]   │
│                                        │
│  Piso/Depto: (opcional)                │
│  [ 5B                            ]   │
│                                        │
│  Localidad: *                          │
│  [ CABA                          ]   │
│                                        │
│  Provincia: *                          │
│  [ Buenos Aires ▼                ]   │
│                                        │
│  Código Postal: *                      │
│  [ 1043                          ]   │
│                                        │
│  Email: *                              │
│  [ juan@email.com                ]   │
│                                        │
│  Teléfono contacto: *                  │
│  [ +54 9 11 1234 5678            ]   │
│                                        │
│  Observaciones: (opcional)             │
│  [ ______________________________ ]   │
│  [ ______________________________ ]   │
│                                        │
│  [Confirmar Envío]                    │
│                                        │
└────────────────────────────────────────┘
```

**Validaciones:**
- Todos los campos con * son obligatorios
- DNI: solo números, 7-8 dígitos
- CP: solo números, 4 dígitos
- Email: formato válido
- Teléfono: formato +54...

**API Call al confirmar:**
```
POST /api/turnos/crear-envio

Body:
{
  "codigo_confirmacion": "A3X7K9",
  "datos_envio": {
    "nombre_destinatario": "Juan Pérez",
    "dni": "12345678",
    "direccion": {
      "calle": "Av. Corrientes",
      "altura": "1234",
      "piso_depto": "5B",
      "localidad": "CABA",
      "provincia": "Buenos Aires",
      "codigo_postal": "1043"
    },
    "email": "juan@email.com",
    "telefono": "+54 9 11 1234 5678",
    "observaciones": "..."
  }
}

// Actualizar estado lead:
// turno_pendiente → envio_registrado
```

---

### Paso 2b: Formulario RETIRO/COLOCACIÓN (si tipo_entrega = "retiro"/"colocacion")

```
┌────────────────────────────────────────┐
│  🗓️ Agendá tu Turno                   │
├────────────────────────────────────────┤
│  ✅ Código válido: A3X7K9             │
│                                        │
│  📋 Tus datos (pre-cargados):         │
│  ┌──────────────────────────────────┐ │
│  │ 👤 Juan Pérez            🔒     │ │
│  │ 📱 +54 9 11...           🔒     │ │
│  │ 📍 CABA                  🔒     │ │
│  │ 🔧 Colocación            🔒     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  📍 Ubicación:                         │
│  VW Maynar AG - Villa Devoto          │
│  [Ver en Google Maps]                 │
│                                        │
│  ⏰ Horarios disponibles:              │
│  Lunes a Viernes: 9-13hs y 14-15:30hs│
│                                        │
│  📅 Elegí fecha: *                     │
│  [Calendario - solo Lun-Vie]          │
│  Seleccionado: Viernes 15 de Enero    │
│                                        │
│  ⏰ Elegí horario: *                   │
│  [09:00] [09:30] [10:00] [10:30]     │
│  [11:00] [11:30] [12:00] [12:30]     │
│  [14:00] [14:30] [15:00]              │
│                                        │
│  Seleccionado: 10:00hs                 │
│                                        │
│  ✅ Tu turno:                          │
│  Viernes 15/01 - 10:00hs              │
│  Duración: 1-2 horas                   │
│                                        │
│  [Confirmar Turno]                    │
│                                        │
└────────────────────────────────────────┘
```

**Horarios según tipo:**
- **RETIRO:** 9-13hs y 14-17hs (slots hasta 16:30)
- **COLOCACIÓN:** 9-13hs y 14-15:30hs (slots hasta 15:00, dura 1-2hs)

**API Call al confirmar:**
```
POST /api/turnos/crear

Body:
{
  "codigo_confirmacion": "A3X7K9",
  "fecha": "2025-01-15",
  "hora_inicio": "10:00",
  "tipo": "colocacion"
}

// Trigger auto_assign_lead_to_turno():
// - Asigna lead_id automáticamente
// - Determina estado_pago
// - Actualiza estado: turno_pendiente → turno_agendado
```

---

### Paso 3: Confirmación

```
┌────────────────────────────────────────┐
│  ✅ ¡Registro Exitoso!                 │
├────────────────────────────────────────┤
│                                        │
│  🎫 Código: A3X7K9                    │
│  👤 Juan Pérez                         │
│                                        │
│  [ PARA ENVÍO ]                        │
│  📦 Envío a domicilio                  │
│  📍 Av. Corrientes 1234, 5B           │
│      CABA (1043)                       │
│  📧 juan@email.com                     │
│                                        │
│  📲 Te contactaremos en 24-48hs       │
│     para coordinar la entrega          │
│                                        │
│  ⏱️ Estimado: 5-7 días hábiles        │
│                                        │
│  [ O PARA RETIRO/COLOCACIÓN ]         │
│  📅 Viernes 15 de Enero                │
│  ⏰ 10:00hs                             │
│  📍 VW Maynar AG - Villa Devoto       │
│                                        │
│  📋 No olvides traer:                  │
│  • Tu DNI                              │
│  • Tu vehículo (si es colocación)     │
│  • Este código: A3X7K9                │
│                                        │
│  📧 Te enviamos confirmación por email│
│                                        │
│  [Descargar Comprobante]              │
│  [Volver al Inicio]                   │
│                                        │
└────────────────────────────────────────┘
```

---

## 🗄️ Cambios en Base de Datos

### Tabla `leads` - Sin cambios

Ya tiene:
- `codigo_confirmacion VARCHAR(6) UNIQUE` ✅
- Trigger genera código automáticamente ✅

### Tabla `turnos` - Pequeña modificación

**Agregar campo para datos de envío:**

```sql
ALTER TABLE turnos 
ADD COLUMN datos_envio JSONB;

-- Ejemplo de estructura:
{
  "nombre_destinatario": "Juan Pérez",
  "dni": "12345678",
  "direccion": {
    "calle": "Av. Corrientes",
    "altura": "1234",
    "piso_depto": "5B",
    "localidad": "CABA",
    "provincia": "Buenos Aires",
    "codigo_postal": "1043"
  },
  "email": "juan@email.com",
  "telefono": "+54 9 11 1234 5678",
  "observaciones": "..."
}
```

### Nuevos Estados

```sql
-- Para envío (cuando cliente completa formulario web):
'envio_registrado'  -- Cliente completó datos, esperando coordinación logística

-- Para retiro/colocación (se mantienen):
'turno_pendiente'   -- Esperando que cliente agende
'turno_agendado'    -- Cliente agendó fecha/hora
```

---

## 🔧 API Endpoints

### 1. GET `/api/turnos/buscar-por-codigo` ✅

**Ya existe** - Retorna datos del lead

### 2. POST `/api/turnos/crear` ✅

**Ya existe** - Crea turno para retiro/colocación

### 3. POST `/api/turnos/crear-envio` 🆕

**NUEVO** - Crear registro de envío

```typescript
export async function POST(request: NextRequest) {
  const { codigo_confirmacion, datos_envio } = await request.json()
  
  // 1. Validar código
  const lead = await sql`
    SELECT id FROM leads WHERE codigo_confirmacion = ${codigo_confirmacion}
  `
  
  if (lead.length === 0) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 })
  }
  
  // 2. Crear registro en turnos con datos_envio
  await sql`
    INSERT INTO turnos (
      codigo_confirmacion,
      lead_id,
      tipo,
      datos_envio,
      estado
    ) VALUES (
      ${codigo_confirmacion},
      ${lead[0].id},
      'envio',
      ${JSON.stringify(datos_envio)},
      'pendiente'
    )
  `
  
  // 3. Actualizar estado del lead
  await sql`
    UPDATE leads 
    SET estado = 'envio_registrado'
    WHERE id = ${lead[0].id}
  `
  
  return NextResponse.json({ success: true })
}
```

---

## 📊 Flujo Completo Actualizado

```
1. Cliente paga → Recibe código A3X7K9

2. Cliente elige tipo de entrega:
   - Envío
   - Retiro
   - Colocación

3. Bot SIEMPRE envía:
   - Código A3X7K9
   - Link: https://topneum.com/turnos
   - Estado lead: turno_pendiente

4. Cliente entra a web → Ingresa código

5. API retorna:
   - Datos del lead (precargados y bloqueados)
   - tipo_entrega (define qué formulario mostrar)

6a. Si tipo_entrega = "envio":
    → Formulario de datos de envío
    → Cliente completa dirección, DNI, email, etc.
    → POST /api/turnos/crear-envio
    → Estado: turno_pendiente → envio_registrado
    → Admin coordina logística

6b. Si tipo_entrega = "retiro" o "colocacion":
    → Formulario de agendamiento
    → Cliente elige fecha + hora
    → POST /api/turnos/crear
    → Trigger vincula lead_id
    → Estado: turno_pendiente → turno_agendado
```

---

## ✅ Ventajas del Nuevo Sistema

| Aspecto | ANTES (WhatsApp) | AHORA (Web) |
|---------|------------------|-------------|
| **UX Envío** | ❌ Escribir datos largos por WhatsApp | ✅ Formulario con validación |
| **Errores Tipográficos** | ⚠️ Frecuentes | ✅ Validación automática |
| **Consistencia** | ❌ Envío ≠ Retiro/Colocación | ✅ Mismo flujo para todos |
| **Tracking** | ⚠️ Mensajes de WhatsApp | ✅ Base de datos estructurada |
| **Profesionalismo** | ⚠️ Chat informal | ✅ Plataforma web |
| **Facilidad Cliente** | ❌ Copiar/pegar datos | ✅ Completar formulario |

---

## 📋 Checklist de Implementación

### Backend
- [x] Sistema de códigos ✅
- [x] API buscar-por-codigo ✅
- [x] API crear turno ✅
- [ ] API crear-envio (nuevo) 🆕
- [ ] Agregar columna `datos_envio` a turnos 🆕
- [ ] Agregar estado `envio_registrado` 🆕

### Frontend (Equipo Web)
- [ ] Página `/turnos` con input de código
- [ ] Formulario ENVÍO (condicional si tipo="envio")
- [ ] Formulario RETIRO/COLOCACIÓN (condicional)
- [ ] Validaciones de campos
- [ ] Integración con APIs
- [ ] Página de confirmación
- [ ] Responsive design

### Bot
- [x] Prompt actualizado para enviar código siempre ✅
- [x] Mensaje simplificado (sin solicitar datos) ✅
- [x] Estado `turno_pendiente` para todos ✅

---

**Fecha:** 09/01/2025  
**Cambio estratégico:** Unificar TODO en web con código único  
**Status:** ✅ Prompt actualizado | ⚠️ Pendiente: API envío + Frontend
