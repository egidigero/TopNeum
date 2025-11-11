# 🛠️ Configuración de Tools para n8n

## Herramienta 1: buscar_productos

### Información Básica
- **Nombre:** `buscar_productos`
- **Descripción:** `Busca productos de neumáticos en el catálogo de TopNeum según medida, marca y región. Devuelve lista de productos disponibles con precios para CABA e Interior.`

### Configuración HTTP Request

```yaml
Method: POST
URL: https://top-neum-h5x5.vercel.app/api/productos/buscar
Authentication: None
Body Content Type: JSON
```

### Body (JSON)

```json
{
  "medida_neumatico": "={{$json.medida_neumatico}}",
  "marca": "={{$json.marca}}",
  "region": "={{$json.region}}"
}
```

### Configuración Paso a Paso

1. **Method:** Seleccioná `POST`
2. **URL:** `https://top-neum-h5x5.vercel.app/api/productos/buscar`
3. **Authentication:** `None`
4. **Send Body:** ✅ Activar toggle
5. **Body Content Type:** `JSON`
6. **Specify Body:** `Using Fields Below`
7. **Body Parameters:** Agregá estos 3 parámetros:
   - **Name:** `medida_neumatico` / **Value:** `={{$json.medida_neumatico}}`
   - **Name:** `marca` / **Value:** `={{$json.marca}}`
   - **Name:** `region` / **Value:** `={{$json.region}}`
8. **Tool Name:** Cambiá el nombre del nodo a `buscar_productos`
9. **Description** (si existe el campo): `Busca productos de neumáticos según medida, marca y región`

**Nota:** En versiones recientes de n8n, el schema se infiere automáticamente del prompt del agente y los parámetros del Body. No necesitás configurar un "Input Schema" explícito.

### Response Format

```json
{
  "productos": [
    {
      "id": "uuid",
      "marca": "HANKOOK",
      "modelo": "OPTIMO H426",
      "medida": "205/55R16",
      "precio_contado_caba": 24000,
      "precio_3_cuotas": 28500,
      "precio_6_cuotas": 31200,
      "precio_12_cuotas": 35800,
      "stock": 20
    }
  ],
  "mensaje_formateado": "🔍 Encontramos 5 opciones para 205/55R16...",
  "total_encontrados": 5
}
```

---

## Herramienta 2: actualizar_estado

### Información Básica
- **Nombre:** `actualizar_estado`
- **Descripción:** `Actualiza el estado de un lead en el CRM de TopNeum. Crea el lead automáticamente si es la primera interacción. Devuelve código de confirmación cuando el lead está en estado 'a_confirmar_pago' o posterior.`

### Configuración HTTP Request

```yaml
Method: POST
URL: https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado
Authentication: Bearer Token
Token: topneum_n8n_2025_secure_key_change_this
Body Content Type: JSON
```

### Headers

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer topneum_n8n_2025_secure_key_change_this"
}
```

### Body (JSON)

```json
{
  "telefono_whatsapp": "={{$json.telefono_whatsapp}}",
  "nuevo_estado": "={{$json.nuevo_estado}}",
  "tipo_vehiculo": "={{$json.tipo_vehiculo}}",
  "medida_neumatico": "={{$json.medida_neumatico}}",
  "marca_preferida": "={{$json.marca_preferida}}"
}
```

### Configuración Paso a Paso

1. **Method:** Seleccioná `POST`
2. **URL:** `https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado`
3. **Authentication:** Seleccioná `Generic Credential Type` → `Header Auth`
   - **Name:** `Authorization`
   - **Value:** `Bearer topneum_n8n_2025_secure_key_change_this`
4. **Send Body:** ✅ Activar toggle
5. **Body Content Type:** `JSON`
6. **Specify Body:** `Using Fields Below`
7. **Body Parameters:** Agregá estos 13 parámetros:
   
   **Datos del cliente (enviar cuando el cliente los menciona):**
   - **Name:** `telefono_whatsapp` / **Value:** `={{$json.telefono_whatsapp}}`
   - **Name:** `nuevo_estado` / **Value:** `={{$json.nuevo_estado}}`
   - **Name:** `tipo_vehiculo` / **Value:** `={{$json.tipo_vehiculo}}`
   - **Name:** `medida_neumatico` / **Value:** `={{$json.medida_neumatico}}`
   - **Name:** `marca_preferida` / **Value:** `={{$json.marca_preferida}}`
   
   **Datos del producto elegido (enviar cuando el cliente elige producto y forma de pago):**
   - **Name:** `producto_marca` / **Value:** `={{$json.producto_marca}}`
   - **Name:** `producto_modelo` / **Value:** `={{$json.producto_modelo}}`
   - **Name:** `producto_medida` / **Value:** `={{$json.producto_medida}}`
   - **Name:** `producto_diseno` / **Value:** `={{$json.producto_diseno}}`
   - **Name:** `precio_unitario` / **Value:** `={{$json.precio_unitario}}`
   - **Name:** `precio_final` / **Value:** `={{$json.precio_final}}`
   - **Name:** `cantidad` / **Value:** `={{$json.cantidad}}`
   - **Name:** `forma_pago` / **Value:** `={{$json.forma_pago}}`

8. **Tool Name:** Cambiá el nombre del nodo a `actualizar_estado`
9. **Description** (si existe el campo): `Actualiza estado del lead en CRM. Crea lead si no existe. Devuelve código de confirmación.`

**Nota:** Esta herramienta requiere autenticación. Asegurate de configurar el Bearer Token correctamente.

### 📋 Descripción de cada parámetro

**Parámetros siempre requeridos:**
- `telefono_whatsapp`: Número del cliente en formato internacional
- `nuevo_estado`: Estado del lead (consulta_producto, en_proceso_de_pago, etc)

**Parámetros del cliente (opcionales - solo si el cliente los menciona):**
- `tipo_vehiculo`: Modelo del auto (ej: "Gol Trend", "Corsa")
- `medida_neumatico`: Medida del neumático (ej: "185/60R15")
- `marca_preferida`: Marca que prefiere (ej: "Pirelli", "Fate")

**Parámetros del producto elegido (opcionales - solo cuando cliente confirma compra):**
- `producto_marca`: Marca del neumático elegido (ej: "PIRELLI")
- `producto_modelo`: Modelo del neumático (ej: "P400")
- `producto_medida`: Medida del neumático (ej: "185/60R15")
- `producto_diseno`: Diseño/línea del neumático (ej: "Cinturato P1")
- `precio_unitario`: Precio por unidad (número, ej: 25000)
- `precio_final`: Precio total con descuentos (número, ej: 100000)
- `cantidad`: Cantidad de neumáticos (número, ej: 4)
- `forma_pago`: Forma de pago (ej: "transferencia", "cuotas", "efectivo")

### ⚠️ IMPORTANTE: Enviar solo NUEVOS datos

**NO repetir datos anteriores**. El sistema acumula automáticamente. Solo envía el campo que el cliente acaba de proporcionar:

**❌ INCORRECTO:**
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "cotizacion_producto",
  "tipo_vehiculo": "Gol Trend",        // Ya estaba guardado
  "medida_neumatico": "185/60R15"      // Recién lo dijo
}
```

**✅ CORRECTO:**
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "cotizacion_producto",
  "medida_neumatico": "185/60R15"      // Solo el nuevo dato
}
```

### Ejemplo de flujo de recolección

**1ra llamada** - Cliente: "Tengo un Gol Trend"
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "consulta_producto",
  "tipo_vehiculo": "Gol Trend"
}
```

**2da llamada** - Cliente: "La medida es 185/60R15"
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "cotizacion_producto",
  "medida_neumatico": "185/60R15"
}
// El sistema YA tiene tipo_vehiculo="Gol Trend", no repetir
```

**3ra llamada** - Cliente: "Me gustan los Pirelli"
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "cotizacion_producto",
  "marca_preferida": "Pirelli"
}
// El sistema YA tiene tipo_vehiculo y medida_neumatico, no repetir
```

**4ta llamada** - Cliente: "Quiero el Pirelli P400, pago por transferencia"
```json
{
  "telefono_whatsapp": "5491112345678",
  "nuevo_estado": "en_proceso_de_pago",
  "producto_marca": "PIRELLI",
  "producto_modelo": "P400",
  "producto_medida": "185/60R15",
  "precio_unitario": 25000,
  "precio_final": 100000,
  "cantidad": 4,
  "forma_pago": "transferencia"
}
// Sistema guarda el producto elegido y genera código de confirmación
```

### Response Format

```json
{
  "success": true,
  "lead_id": "uuid-del-lead",
  "estado_anterior": "consulta_producto",
  "estado_nuevo": "en_proceso_de_pago",
  "codigo_confirmacion": "A3X7K9",
  "datos_recolectados": {
    "tipo_vehiculo": "Gol Trend",
    "medida_neumatico": "185/60R15",
    "marca_preferida": "Pirelli"
  },
  "mensaje": "Lead actualizado exitosamente",
  "created": false
}
```

**Nota:** 
- Si `created: true`, significa que el lead fue creado por primera vez
- `codigo_confirmacion` se usa para que el cliente agende su turno en la web
- `datos_recolectados` muestra todos los datos acumulados del cliente

---

## 🎯 Flujo de Uso Típico

### Ejemplo 1: Cliente consulta por primera vez

```javascript
// 1. Buscar productos
buscar_productos({
  medida_neumatico: "205/55R16",
  marca: null,
  region: "CABA"
})

// 2. Registrar consulta
actualizar_estado({
  telefono_whatsapp: "+54 9 11 1234 5678",
  nuevo_estado: "consulta_producto",
  datos_adicionales: {
    medida_neumatico: "205/55R16"
  }
})

// 3. Enviar cotización al cliente
actualizar_estado({
  telefono_whatsapp: "+54 9 11 1234 5678",
  nuevo_estado: "cotizacion_enviada",
  datos_adicionales: {
    cantidad_opciones: 5,
    medida_cotizada: "205/55R16"
  }
})
```

### Ejemplo 2: Cliente elige producto y sube comprobante

```javascript
// Cliente eligió y va a pagar
actualizar_estado({
  telefono_whatsapp: "+54 9 11 1234 5678",
  nuevo_estado: "en_proceso_de_pago",
  datos_adicionales: {
    producto_elegido: {
      marca: "HANKOOK",
      modelo: "OPTIMO H426",
      medida: "205/55R16"
    },
    forma_pago: "transferencia_sin_factura",
    cantidad: 4,
    total: 96000
  }
})

// Cliente subió comprobante → GENERA CÓDIGO
actualizar_estado({
  telefono_whatsapp: "+54 9 11 1234 5678",
  nuevo_estado: "a_confirmar_pago",
  datos_adicionales: {
    comprobante_enviado: true
  }
})
// Response incluye: { codigo_confirmacion: "A3X7K9", ... }
```

### Ejemplo 3: Cliente elige tipo de entrega

```javascript
actualizar_estado({
  telefono_whatsapp: "+54 9 11 1234 5678",
  nuevo_estado: "turno_pendiente",
  datos_adicionales: {
    tipo_entrega: "colocacion" // o "envio" o "retiro"
  }
})
```

---

## 🔒 Seguridad

### API Key
La herramienta `actualizar_estado` requiere autenticación con Bearer Token.

**En n8n:**
1. Ir a Authentication → Auth Type: **Generic Credential Type**
2. Credential Type: **Header Auth**
3. Name: `Authorization`
4. Value: `Bearer topneum_n8n_2025_secure_key_change_this`

**En Vercel (Environment Variables):**
```
N8N_API_KEY=topneum_n8n_2025_secure_key_change_this
```

---

## ✅ Checklist de Implementación

- [ ] Crear HTTP Request Tool node para `buscar_productos`
- [ ] Configurar Method POST y URL correcta
- [ ] Configurar Body Parameters (medida_neumatico, marca, region)
- [ ] Renombrar nodo a `buscar_productos`
- [ ] Crear HTTP Request Tool node para `actualizar_estado`
- [ ] Configurar Authentication con Bearer Token
- [ ] Configurar Body Parameters (telefono_whatsapp, nuevo_estado, datos_adicionales)
- [ ] Renombrar nodo a `actualizar_estado`
- [ ] Conectar ambas tools al agente conversacional
- [ ] Verificar que el prompt del agente explica cómo usar cada tool
- [ ] Probar flujo completo: consulta → cotización → pago
- [ ] Verificar que código se genera en estado "a_confirmar_pago"

---

## 🧪 URLs de Testing

**Desarrollo Local:**
```
POST http://localhost:3000/api/productos/buscar
POST http://localhost:3000/api/n8n/actualizar-estado
```

**Producción (Vercel):**
```
POST https://top-neum-h5x5.vercel.app/api/productos/buscar
POST https://top-neum-h5x5.vercel.app/api/n8n/actualizar-estado
```

---

## 📝 Notas Importantes

1. **buscar_productos** NO requiere teléfono del cliente
2. **actualizar_estado** crea el lead automáticamente si no existe
3. El **código de confirmación** se genera desde el estado `a_confirmar_pago`
4. El código es de **6 caracteres** alfanuméricos (ej: A3X7K9)
5. El cliente usa ese código en https://topneum.com/turnos
6. **datos_adicionales** es opcional pero muy útil para tracking

---

## 🐛 Troubleshooting

### Error: "Database connection string not valid"
- Verificar que las variables de entorno NO tengan comillas
- En Vercel: NEON_NEON_DATABASE_URL sin comillas

### Error: "Unauthorized" en actualizar_estado
- Verificar Bearer Token en Authentication
- Verificar que N8N_API_KEY coincida en ambos lados

### Error: "No se encontró producto"
- Verificar que la medida esté bien formateada (205/55R16)
- Verificar que existan productos en la tabla `products`
- Probar con región CABA e INTERIOR

### Código no se devuelve
- Verificar que el estado sea >= "a_confirmar_pago"
- Estados que generan código: a_confirmar_pago, pagado, turno_pendiente, turno_agendado

---

**¿Listo para configurar? Empezá por `buscar_productos` que es más simple, y después seguí con `actualizar_estado`.** 🚀
