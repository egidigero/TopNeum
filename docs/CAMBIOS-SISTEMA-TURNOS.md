# Actualización del Sistema de Turnos - 09/01/2025

## 🎯 Cambios Implementados

### 1. Tipos de Entrega Actualizados

**ANTES:**
- ❌ Colocación a domicilio (CABA/GBA con precios diferentes)
- ❌ Envío con costo (CABA: $5.000 / GBA: $8.000)

**AHORA:**
- ✅ **RETIRO en sucursal** - GRATIS
  - 📍 Villa Devoto
  - ⏰ Lun-Vie: 9:00-13:00 y 14:00-17:00

- ✅ **ENVÍO a domicilio** - GRATIS en todo el país
  - 📦 Requiere datos completos del destinatario
  - ⚠️ NO necesita agendar turno (se coordina por logística)

- ✅ **COLOCACIÓN en sucursal** - BONIFICADA
  - 🔧 Incluye: colocación + balanceo + alineación + disposición de viejas
  - 📍 Solo en sucursal VW Maynar AG (Villa Devoto)
  - ⏰ Lun-Vie: 9:00-13:00 y 14:00-15:30
  - ⚠️ NO se hace a domicilio

---

## 📝 Flujo por Tipo de Entrega

### 📦 ENVÍO (Sin Agendamiento)

**Estado:** `pendiente_envio`

**Datos requeridos:**
```
• Nombre del destinatario
• DNI
• Calle
• Altura
• Localidad
• Provincia
• Código Postal
• Teléfono
• Email
```

**Proceso:**
1. Cliente elige envío
2. Bot solicita datos completos
3. Bot actualiza estado a `pendiente_envio`
4. Administración coordina con logística
5. NO se genera código ni link de turnos

---

### 🏪 RETIRO (Con Agendamiento)

**Estado:** `turno_pendiente` → `turno_agendado`

**Horarios:**
- Lunes a Viernes: 9:00-13:00 y 14:00-17:00

**Proceso:**
1. Cliente elige retiro
2. Bot envía código: **A3X7K9**
3. Bot envía link: https://topneum.com/turnos
4. Cliente ingresa código en web
5. Web precarga datos (bloqueados):
   - Nombre
   - Teléfono
   - Región
   - Tipo: retiro
6. Cliente elige fecha y hora
7. Sistema crea turno y vincula automáticamente
8. Estado: `turno_pendiente` → `turno_agendado`

---

### 🔧 COLOCACIÓN (Con Agendamiento)

**Estado:** `turno_pendiente` → `turno_agendado`

**Horarios:**
- Lunes a Viernes: 9:00-13:00 y 14:00-15:30
- ⚠️ Duración estimada: 1-2 horas

**Proceso:**
1. Cliente elige colocación
2. Bot aclara: **Solo en sucursal, NO a domicilio**
3. Bot envía código: **A3X7K9**
4. Bot envía link: https://topneum.com/turnos
5. Cliente ingresa código en web
6. Web precarga datos (bloqueados):
   - Nombre
   - Teléfono
   - Región
   - Tipo: colocacion
7. Cliente elige fecha y hora (slots hasta 15:00)
8. Sistema crea turno y vincula automáticamente
9. Estado: `turno_pendiente` → `turno_agendado`

---

## 🤖 Prompt del Bot Actualizado

### Después de Confirmar Pago

```markdown
💡 Mientras tanto, para ir avanzando:
¿Cómo preferís recibir tus neumáticos?

1️⃣ RETIRO en sucursal (Villa Devoto) - GRATIS ✅
   📍 Lunes a Viernes: 9:00 a 13:00 y 14:00 a 17:00

2️⃣ ENVÍO a domicilio - GRATIS en todo el país 🚚✅
   (te pediremos datos de envío)

3️⃣ COLOCACIÓN en sucursal VW Maynar AG (Villa Devoto) - BONIFICADA ✅
   🔧 Incluye: colocación + balanceo + alineación
   📍 Lunes a Viernes: 9:00 a 13:00 y 14:00 a 15:30
   ⚠️ NO hacemos colocación a domicilio
```

### Respuesta para ENVÍO

```markdown
Perfecto! 🚚 Envío GRATIS a todo el país ✅

Para coordinar la entrega, necesito estos datos:

📝 Datos del destinatario:
• Nombre completo:
• DNI:
• Calle:
• Altura:
• Localidad:
• Provincia:
• Código Postal (CP):
• Teléfono:
• Email:

Una vez que me los pases, coordinamos el envío 📦
```

### Respuesta para RETIRO

```markdown
Perfecto! 🏪 Retiro en sucursal - Villa Devoto

🎫 *TU CÓDIGO DE CONFIRMACIÓN:* [CÓDIGO]

⚠️ *MUY IMPORTANTE:* Guardá este código, lo necesitás para agendar tu turno.

🗓️ Agendá tu turno acá:
👉 https://topneum.com/turnos

📍 Dirección: VW Maynar AG - Villa Devoto
⏰ Horarios de retiro:
   Lunes a Viernes: 9:00 a 13:00 y 14:00 a 17:00

Cuando entres a la web:
1️⃣ Ingresá tu código: *[CÓDIGO]*
2️⃣ Se cargarán tus datos automáticamente
3️⃣ Elegí fecha y horario
4️⃣ ¡Listo! Te llegará la confirmación

📋 Traé:
• Tu DNI
• Este código: *[CÓDIGO]*

¿Alguna duda? 😊
```

### Respuesta para COLOCACIÓN

```markdown
Perfecto! 🔧 Colocación BONIFICADA en sucursal

🎫 *TU CÓDIGO DE CONFIRMACIÓN:* [CÓDIGO]

⚠️ *MUY IMPORTANTE:* Guardá este código, lo necesitás para agendar tu turno.

🗓️ Agendá tu turno acá:
👉 https://topneum.com/turnos

📍 Dirección: VW Maynar AG - Villa Devoto
⏰ Horarios de colocación:
   Lunes a Viernes: 9:00 a 13:00 y 14:00 a 15:30

⚠️ IMPORTANTE: La colocación se realiza en nuestra sucursal.
   NO hacemos colocación a domicilio.

Cuando entres a la web:
1️⃣ Ingresá tu código: *[CÓDIGO]*
2️⃣ Se cargarán tus datos automáticamente
3️⃣ Elegí fecha y horario
4️⃣ ¡Listo! Te llegará la confirmación

✅ La colocación incluye:
   ✓ Colocación de neumáticos
   ✓ Balanceo
   ✓ Alineación
   ✓ Disposición de cubiertas viejas

📋 Traé tu vehículo y este código: *[CÓDIGO]*

⏱️ Duración estimada del servicio: 1-2 horas

¿Alguna duda? 😊
```

---

## 🌐 Página Web de Agendamiento

### Características Clave

1. **Input de Código** (6 caracteres alfanuméricos)
   - Auto-convertir a mayúsculas
   - Validar al completar o con botón "Verificar"

2. **Consulta API:**
   ```
   GET /api/turnos/buscar-por-codigo?codigo=A3X7K9
   ```

3. **Datos Precargados (BLOQUEADOS 🔒):**
   - Nombre del cliente
   - Teléfono
   - Región
   - Tipo de entrega (retiro/colocacion)
   
   ⚠️ Cliente NO puede modificar estos datos

4. **Selección de Fecha y Hora:**
   - Calendario: solo Lunes a Viernes
   - Horarios según tipo:
     - **RETIRO:** slots hasta 16:30 (cierra 17:00)
     - **COLOCACIÓN:** slots hasta 15:00 (dura 1-2hs, cierra 15:30)

5. **Confirmación:**
   - Crear turno con código
   - Trigger asigna lead automáticamente
   - Mostrar comprobante con código, fecha, hora, ubicación

---

## 🔧 API Endpoint Creado

### GET `/api/turnos/buscar-por-codigo`

**Query params:**
- `codigo`: Código de 6 caracteres (ej: A3X7K9)

**Response:**
```json
{
  "exists": true,
  "lead": {
    "id": "uuid...",
    "codigo_confirmacion": "A3X7K9",
    "nombre_cliente": "Juan Pérez",
    "telefono_whatsapp": "+54 9 11 1234 5678",
    "region": "CABA",
    "tipo_entrega": "colocacion",
    "estado": "turno_pendiente"
  },
  "turno_existente": {
    "id": "uuid...",
    "fecha": "2025-01-15",
    "hora_inicio": "10:00",
    "tipo": "colocacion",
    "estado": "confirmado",
    "estado_pago": "confirmado"
  }
}
```

Si `turno_existente !== null`, mostrar:
> "Ya tenés un turno agendado para el 15/01 a las 10:00"
> "¿Querés modificarlo?"

---

## 📋 Checklist de Implementación

### Backend ✅
- [x] Sistema de códigos en DB
- [x] Triggers de vinculación
- [x] API endpoint buscar-por-codigo
- [x] Prompt del bot actualizado

### Frontend (Pendiente para equipo web)
- [ ] Página `/turnos` con formulario
- [ ] Input de código con validación
- [ ] Integración con API buscar-por-codigo
- [ ] Precarga de datos (campos bloqueados)
- [ ] Calendario con horarios según tipo
- [ ] Creación de turno via API
- [ ] Página de confirmación

---

## 📍 Información de Sucursal

**Nombre:** VW Maynar AG  
**Ubicación:** Villa Devoto, Buenos Aires  
**Dirección:** [A COMPLETAR]  

**Horarios:**
- **Retiro:** Lunes a Viernes 9:00-13:00 y 14:00-17:00
- **Colocación:** Lunes a Viernes 9:00-13:00 y 14:00-15:30

**Servicios:**
- ✅ Retiro de neumáticos
- ✅ Colocación + balanceo + alineación + disposición
- ❌ NO colocación a domicilio

---

## 🎯 Beneficios del Nuevo Sistema

1. **Para el Cliente:**
   - Envío gratis a todo el país
   - Colocación bonificada
   - Código único fácil de recordar (ej: A3X7K9)
   - Datos precargados (no hay que volver a escribirlos)
   - Agendamiento online 24/7

2. **Para TopNeum:**
   - Identificación inequívoca de leads
   - Menos errores en turnos
   - Estado de pago visible (confirmado/pendiente)
   - Tracking completo en CRM
   - Reducción de coordinación manual para envíos

3. **Para el Sistema:**
   - Vinculación automática 100% confiable
   - Datos consistentes (no modificables por cliente)
   - Flujo optimizado según tipo de entrega
   - Estados claros: pendiente_envio vs turno_pendiente

---

## ⚠️ Puntos Críticos a Comunicar

### Al Cliente

1. **Colocación NO es a domicilio** - Siempre en sucursal
2. **Código es único** - Guardarlo para agendar
3. **Horarios limitados** - Colocación cierra 15:30
4. **Datos no modificables** - Lo que está precargado se mantiene

### Al Equipo Web

1. **Bloquear campos precargados** - No permitir edición
2. **Validar horarios según tipo** - Retiro vs Colocación diferentes
3. **Consultar disponibilidad** - No permitir turnos ya ocupados
4. **Manejar turno existente** - Avisar si ya agendó antes

### A Administración

1. **Envíos se coordinan aparte** - NO usan sistema de turnos
2. **Estado "pendiente_envio"** - Cliente esperando logística
3. **Código en tabla pedidos** - Para identificar quién es quién
4. **Estado pago en turnos** - Ver quién pagó vs quién solo agendó

---

## 📚 Documentación Actualizada

- ✅ `docs/prompt-agente-con-tools.md` - Prompt completo del bot
- ✅ `docs/SISTEMA-CODIGOS-CONFIRMACION.md` - Sistema de códigos
- ✅ `docs/CAMBIOS-SISTEMA-TURNOS.md` - Este documento
- ✅ `app/api/turnos/buscar-por-codigo/route.ts` - Nuevo endpoint

---

**Fecha de actualización:** 09/01/2025  
**Implementado por:** GitHub Copilot  
**Status:** ✅ Backend completo | ⏳ Frontend pendiente
