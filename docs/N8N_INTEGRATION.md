# Integración de Catálogo con Agente de n8n

## 📋 Resumen
Este documento describe cómo integrar el catálogo de neumáticos con un agente de IA en n8n para asistir a vendedores.

## 🔌 APIs Disponibles

### 1. Búsqueda de Productos
**Endpoint:** `GET /api/productos/search`

**Casos de uso:**
- "¿Tienen neumáticos marca Yokohama?"
- "Necesito un 175/60R15"
- "Busco algo entre $15000 y $20000"

**Parámetros:**
```
q          - Búsqueda general (sku, marca, medida, descripción)
medida     - Filtro exacto por medida (ej: 175/60R15)
marca      - Filtro por marca (ej: Yokohama)
precioMin  - Precio mínimo
precioMax  - Precio máximo
limit      - Cantidad de resultados (default 10, max 50)
```

**Ejemplo:**
```bash
GET https://tu-dominio.com/api/productos/search?medida=175/60R15&marca=Yokohama
```

**Respuesta:**
```json
{
  "productos": [
    {
      "sku": "1756015YH",
      "marca": "Yokohama",
      "medida": "175/60R15",
      "descripcion_larga": "175/60R15 ADVAN A050 Yokohama",
      "precio_lista_fact": 19200,
      "cuota_3": 6400,
      "cuota_6": 3200,
      "cuota_12": 1600,
      "efectivo_bsas_sin_iva": 17280
    }
  ],
  "total": 1
}
```

---

### 2. Verificar Disponibilidad
**Endpoint:** `GET /api/productos/disponibilidad?sku=XXX`

**Casos de uso:**
- "¿Tienen stock del código 1756015YH?"
- "Está disponible el neumático X?"

**Ejemplo:**
```bash
GET https://tu-dominio.com/api/productos/disponibilidad?sku=1756015YH
```

**Respuesta:**
```json
{
  "disponible": true,
  "producto": {
    "sku": "1756015YH",
    "marca": "Yokohama",
    "medida": "175/60R15",
    "descripcion_para_cliente": "Yokohama 175/60R15 - 175/60R15 ADVAN A050 Yokohama",
    "precio_contado": 17280,
    "precio_lista": 19200,
    "opciones_cuotas": {
      "cuota_3": 6400,
      "cuota_6": 3200,
      "cuota_12": 1600
    }
  }
}
```

---

### 3. Comparar Productos
**Endpoint:** `GET /api/productos/comparar?skus=SKU1,SKU2,SKU3`

**Casos de uso:**
- "¿Cuál es la diferencia entre estas dos opciones?"
- "Compárame estos neumáticos"

**Ejemplo:**
```bash
GET https://tu-dominio.com/api/productos/comparar?skus=1756015YH,1756015GM
```

**Respuesta:**
```json
{
  "productos": [...],
  "resumen": {
    "cantidad_productos": 2,
    "rango_precios": {
      "minimo": 19200,
      "maximo": 28800,
      "diferencia": 9600
    },
    "recomendacion": "La diferencia de precio es de $9600. El GreenMax 175/60R15 es la opción más económica."
  },
  "comparacion": [...]
}
```

---

### 4. Lista de Productos (Existente)
**Endpoint:** `GET /api/productos`

Para obtener el catálogo completo o con filtros básicos.

---

## 🤖 Flujo Sugerido en n8n

### Workflow Básico:

```
1. [Trigger] Webhook/Chat Input
   ↓
2. [AI Agent] Analizar intención del cliente
   ↓
3. [Switch] Según intención:
   ├── Búsqueda → HTTP Request a /search
   ├── Disponibilidad → HTTP Request a /disponibilidad
   ├── Comparación → HTTP Request a /comparar
   └── Otro → Respuesta genérica
   ↓
4. [AI Agent] Formatear respuesta natural
   ↓
5. [Output] Enviar al cliente
```

### Ejemplo de Prompt para el Agente:

```
Eres un asistente de ventas de neumáticos. Tienes acceso a estas herramientas:

1. search_productos(q, medida, marca, precioMin, precioMax)
   - Usa esto cuando el cliente busque productos
   
2. verificar_disponibilidad(sku)
   - Usa esto para consultar stock/precios de un producto específico
   
3. comparar_productos(skus)
   - Usa esto cuando el cliente quiera comparar opciones

Cuando respondas:
- Sé amable y profesional
- Menciona siempre el precio de contado (efectivo_bsas_sin_iva)
- Ofrece opciones de cuotas si están disponibles
- Si hay múltiples opciones, ayuda al cliente a elegir
```

---

## 💡 Consejos de Implementación

### 1. **Caché de Resultados Frecuentes**
Usa n8n Memory Node para cachear búsquedas comunes:
- Medidas más vendidas
- Marcas populares
- Rangos de precio típicos

### 2. **Manejo de Errores**
```javascript
// En n8n Function Node
try {
  const response = await $http.get('/api/productos/search', {
    params: { medida: '175/60R15' }
  })
  return response.productos
} catch (error) {
  return {
    error: true,
    mensaje: "No pude buscar productos ahora. ¿Puedes intentar de nuevo?"
  }
}
```

### 3. **Respuestas Contextuales**
Guarda el contexto de la conversación:
```javascript
const context = $('Memory').getAll()
if (context.ultima_busqueda) {
  // El cliente puede preguntar "¿Y en cuotas?" sin repetir el producto
}
```

---

## 📊 Campos Importantes para el Agente

### Precios:
- `precio_lista_fact` - Precio de lista oficial
- `efectivo_bsas_sin_iva` - **Precio recomendado para efectivo** (10% descuento)
- `cuota_3/6/12` - Opciones de financiación
- `mayorista_fact/sin_fact` - Para clientes mayoristas

### Información del Producto:
- `sku` - Código único
- `marca` - Marca del neumático
- `medida` - Medida (ej: 175/60R15)
- `descripcion_larga` - Descripción completa generada automáticamente
- `linea` - Línea de producto
- `diseno_linea` - Diseño específico
- `stock` - Valor de stock (puede ser número, "OK", o vacío)
- `tiene_stock` - Boolean calculado automáticamente (TRUE si hay stock)

---

## 🔐 Autenticación

Las APIs están protegidas. Asegúrate de:
1. Incluir token de autenticación en los headers
2. Crear un usuario de solo lectura en la DB para n8n (ver `scripts/005-grants-for-n8n.sql`)

---

## 🚀 Casos de Uso Reales

### Caso 1: Cliente Pregunta por Medida
```
Cliente: "Hola, necesito neumáticos 175/60R15"
Agente: → search_productos(medida="175/60R15")
Respuesta: "Tengo estas opciones en 175/60R15:
- Yokohama ADVAN A050 - $17,280 contado ($19,200 lista)
- GreenMax HP010 - $15,360 contado ($16,320 lista)
¿Te interesa alguna en particular?"
```

### Caso 2: Consulta de Stock
```
Cliente: "Tienen el código 001-100-R2420?"
Agente: → verificar_disponibilidad(sku="001-100-R2420")
Respuesta: "Sí, tenemos el Yokohama 175/70R13 BLUEARTH ES32:
- Stock: 4 unidades disponibles
- Precio contado: $139,999
- Precio lista: $158,999
- En 3 cuotas: $184,999
- En 6 cuotas: $217,999"
```

### Caso 3: Comparación
```
Cliente: "Cuál es mejor entre el Yokohama y el GreenMax?"
Agente: → comparar_productos(skus="1756015YH,1756015GM")
Respuesta: "Te comparo las dos opciones:
- Yokohama ADVAN A050: $17,280 (premium)
- GreenMax HP010: $15,360 (económico)
Diferencia: $1,920
El GreenMax es excelente relación precio-calidad. El Yokohama tiene mejor performance en ruta."
```

---

## 📞 Soporte

Si necesitas ayuda con la integración, revisa:
- `scripts/README.md` - Configuración de DB
- `scripts/005-grants-for-n8n.sql` - Permisos de acceso
- Logs en `logs/productos.log` - Debugging de imports/ajustes
