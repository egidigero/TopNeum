# 📋 RESUMEN - Sistema de Agente TopNeum v2

## 🎯 Cambios Principales vs Versión Anterior

### ✅ MEJORADO:

1. **Prompt estructurado por FASES**
   - Fase 1: Descubrimiento (saludo fijo)
   - Fase 2: Recolección de datos
   - Fase 3: Búsqueda y cotización
   - Fase 4: Múltiples consultas
   - Fase 5: Cliente elige producto
   - Fase 6: Pedidos múltiples
   - Fase 7: Formas de pago
   - Fase 8: Entrega

2. **Tool `actualizar_estado` con campos estructurados**
   - Ya NO es solo "notas en texto"
   - Ahora tiene campos específicos: `tipo_vehiculo`, `medida_neumatico`, `marca_preferida`, `cantidad`, `producto_descripcion`, `forma_pago_detalle`, `precio_final`, `notas`
   - Los datos se **acumulan** (no se sobrescriben)
   - Soporta múltiples consultas del mismo cliente

3. **Memoria = Campos + Notas**
   - El agente recibe TODO el estado del lead en cada mensaje
   - Incluye campos estructurados Y notas con timestamps
   - Evita repetir preguntas

4. **Mostrar solo lo solicitado**
   - Si pide Pirelli → Solo Pirelli
   - Si no hay stock → Sugerir 2-3 alternativas
   - Si no pidió marca → Mostrar 2-3 mejores opciones

5. **Nunca asumir cantidad**
   - SIEMPRE preguntar explícitamente
   - Esperar confirmación del cliente

6. **Casos especiales bien definidos**
   - Michelin/BF Goodrich: Recolectar info + crear ticket
   - Medida no disponible: Confirmar + crear ticket
   - Sin stock: Sugerir alternativas

---

## 📂 Archivos Creados

1. **[prompt-agente-v2.md](prompt-agente-v2.md)**
   - Prompt completo por fases
   - Tono profesional argentino (no roboteo)
   - Reglas claras para cada fase
   - Ejemplos de tono correcto/incorrecto

2. **[n8n-tools-estructura.md](n8n-tools-estructura.md)**
   - Estructura de las 3 tools para n8n
   - Input/Output schemas JSON
   - Lógica interna de cada tool

3. **[implementacion-n8n.md](implementacion-n8n.md)**
   - Guía paso a paso para implementar
   - Queries SQL completas
   - Code nodes con la lógica
   - Configuración de tools en AI Agent

---

## 🔧 Las 3 Tools

### 1. `buscar_productos`
- Busca en BD según medida y opcionalmente marca
- Si pide marca específica → Solo esa marca
- Si no hay stock → Devolver vacío (el agente sugerirá alternativas)
- Si no pidió marca → Traer 2-3 mejores opciones

### 2. `actualizar_estado` ⭐ CLAVE
- Actualiza campos estructurados del lead
- **Campos:** telefono, estado, nombre, tipo_vehiculo, medida_neumatico, marca_preferida, cantidad, producto_descripcion, forma_pago_detalle, precio_final, notas
- Los datos se **acumulan** (no reemplazan)
- Notas se concatenan con timestamp
- Soporta múltiples consultas
- **ESTO ES LO QUE SE LEE COMO MEMORIA**

### 3. `crear_ticket`
- Solo para casos especiales:
  - Michelin/BF Goodrich
  - Medida no disponible
  - Consultas técnicas
  - Reclamos

---

## 🧠 MEMORIA = Leer el Lead ANTES de Responder

**⚠️ SÚPER IMPORTANTE:**

El AI Agent **NO tiene memoria** entre mensajes. Por eso, el flujo es:

```
1. Cliente envía mensaje
   ↓
2. LEER toda la info del lead de la BD ⭐
   ↓
3. Pasar esa info como CONTEXT al AI Agent
   ↓
4. Agente responde usando esa memoria
   ↓
5. Si llama actualizar_estado, se GUARDA en BD
   ↓
6. Fin

(Siguiente mensaje, volver al paso 1)
```

**La memoria = El registro del lead en la BD**

Ver [COMO-FUNCIONA-LA-MEMORIA.md](COMO-FUNCIONA-LA-MEMORIA.md) para explicación completa con diagramas.

---

## 🎯 Flujo Simplificado

```
1. Cliente saluda
   → Agente: Saludo fijo (FASE 1)
   → actualizar_estado(estado: "nuevo")

2. Cliente: "185/60R15 para Gol Trend"
   → actualizar_estado(tipo_vehiculo: "Volkswagen Gol Trend", medida: "185/60R15", notas: "...")
   → Agente: "¿Tenés marca preferida?"

3. Cliente: "Pirelli"
   → actualizar_estado(marca_preferida: "Pirelli", notas: "...")
   → buscar_productos(medida: "185/60R15", marca: "Pirelli", region: "CABA")
   → Agente: Muestra SOLO Pirelli (o alternativas si no hay)
   → actualizar_estado(estado: "cotizado", notas: "...")

4. Cliente: "Me llevo el Pirelli"
   → Agente: "¿Cuántas cubiertas?" (NUNCA ASUMIR)

5. Cliente: "4"
   → buscar_productos (validar de nuevo)
   → Agente: Confirma pedido con precios
   → actualizar_estado(cantidad: 4, notas: "...")

6. Cliente: "Contado"
   → actualizar_estado(
       producto_descripcion: "PIRELLI P400 EVO 185/60R15",
       cantidad: 4,
       forma_pago_detalle: "Contado: $96.000",
       precio_final: 96000,
       estado: "esperando_pago",
       notas: "Pedido confirmado: 4 Pirelli..."
     )
   → Agente: Da código de confirmación + link

7. Listo ✅
```

---

## ⚠️ Reglas Críticas

### DO ✅
- Leer memoria ANTES de responder
- Actualizar estado tras CADA dato nuevo
- Validar con `buscar_productos` antes de confirmar precios
- Preguntar cantidad explícitamente
- Mostrar solo lo que pidió el cliente
- Sugerir alternativas si no hay stock
- Respuestas concisas (3-4 líneas)

### DON'T ❌
- Asumir cantidad (ni 4 ni ninguna)
- Confiar en precios que dice el cliente
- Crear pedidos sin validar en BD
- Enviar links de MercadoPago para cuotas
- Ofrecer 6/12 cuotas si no preguntan
- Usar negritas en respuestas
- Repetir preguntas ya respondidas

---

## 🗂️ Estructura de BD

### Tabla `leads`:
```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  telefono VARCHAR(20) UNIQUE NOT NULL,
  estado VARCHAR(50),
  nombre VARCHAR(100),
  tipo_vehiculo VARCHAR(100),
  medida_neumatico VARCHAR(20),
  marca_preferida VARCHAR(50),
  cantidad INTEGER,
  producto_descripcion TEXT,
  forma_pago_detalle VARCHAR(200),
  precio_final DECIMAL(10,2),
  notas TEXT,
  region VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla `productos`:
```sql
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  marca VARCHAR(50),
  modelo VARCHAR(100),
  medida VARCHAR(20),
  precio_contado_caba DECIMAL(10,2),
  precio_contado_interior DECIMAL(10,2),
  precio_3_cuotas DECIMAL(10,2),
  precio_6_cuotas DECIMAL(10,2),
  precio_12_cuotas DECIMAL(10,2),
  stock INTEGER,
  popularidad INTEGER
);
```

### Tabla `tickets`:
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  tipo VARCHAR(50),
  descripcion TEXT,
  prioridad VARCHAR(20),
  estado VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Próximos Pasos

1. ✅ **Implementar en n8n:**
   - Crear workflows para las 3 tools
   - Configurar AI Agent con prompt v2
   - Conectar con WhatsApp

2. ✅ **Probar casos:**
   - Consulta simple
   - Cliente pide marca específica
   - No hay stock de esa marca
   - Múltiples consultas
   - Michelin/BF Goodrich

3. ✅ **Ajustar según feedback:**
   - Ver logs de n8n
   - Identificar casos edge
   - Mejorar respuestas

---

## 📊 Comparación vs Versión Anterior

| Aspecto | Versión Anterior | Versión Nueva |
|---------|-----------------|---------------|
| **Memoria** | Solo notas en texto | Campos estructurados + notas |
| **Tool actualizar** | Solo texto libre | Campos específicos + notas |
| **Tono** | Muy informal argentino | Profesional pero cercano |
| **Flujo** | Lineal | Por fases claras |
| **Cantidad** | A veces asumía 4 | NUNCA asume, siempre pregunta |
| **Stock** | Confuso | Si no hay, sugiere alternativas |
| **Múltiples consultas** | Confuso | Soportado explícitamente |
| **Casos especiales** | No bien definidos | Michelin, sin stock, etc. claros |

---

**Sistema listo para implementar en n8n** 🚀
