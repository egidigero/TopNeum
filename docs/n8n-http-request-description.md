# 📡 Descripción para HTTP Request en n8n

**Para configurar en el campo "Description" del nodo HTTP Request**

---

## TOOL: `actualizar_estado`

**Descripción corta (para n8n):**
```
Actualiza el estado del lead en el CRM. CRÍTICO: Llamar INMEDIATAMENTE después de cada dato que menciona el cliente (nombre, vehículo, medida, marca, notas). Si cliente da info nueva → actualizar antes de continuar. Crea lead automáticamente en primera interacción. Soporta múltiples consultas (acumula, no sobrescribe).
```

**Cuándo usar:**
- Cliente menciona nombre → actualizar con `nombre`
- Cliente menciona vehículo → actualizar con `tipo_vehiculo`
- Cliente menciona medida → actualizar con `medida_neumatico`
- Cliente menciona marca → actualizar con `marca_preferida`
- Cliente hace comentario importante → actualizar con `notas`
- Envías cotización → actualizar con `nuevo_estado: "cotizado"`
- Cliente elige producto → actualizar con datos completos del pedido

**Regla de oro:** ¿Cliente dio información nueva? → Actualizar INMEDIATAMENTE antes de continuar.

---

## TOOL: `buscar_productos`

**Descripción corta (para n8n):**
```
Busca neumáticos en catálogo por medida. SIEMPRE usar antes de crear pedido. Devuelve productos con precios según región + mensaje formateado para WhatsApp. Solo mostrar marcas: Yokohama, Hankook, LingLong, Laufenn, Nankang.
```

**Cuándo usar:**
- Cliente menciona medida de neumático
- ANTES de confirmar cualquier pedido (validar existencia)
- Cliente pregunta por precios
- Necesitas cotización actualizada

**Importante:** NUNCA buscar sin medida explícita del cliente.

---

## TOOL: `crear_ticket`

**Descripción corta (para n8n):**
```
Crea ticket de soporte para atención humana. Usar cuando: cliente pregunta por Michelin/BF Goodrich (marca_especial), medida no disponible (0 resultados), consulta técnica compleja, problema de pago, reclamo. Prioridad URGENTE: cliente envía comprobante o elige cuotas.
```

**Cuándo usar:**
- Cliente pregunta por **Michelin** o **BF Goodrich** → crear ticket "marca_especial" (ALTA prioridad)
- `buscar_productos` devuelve 0 resultados → crear ticket "medida_no_disponible"
- Consulta técnica que no podés resolver → crear ticket "consulta_tecnica"
- Cliente envía comprobante de pago → crear ticket "confirmacion_pago" (URGENTE)
- Cliente elige pago en cuotas → crear ticket "pago_cuotas" (URGENTE)
- Cliente reclama → crear ticket "reclamo" (URGENTE)

**Importante:** 
- Descripción COMPLETA con nombre, vehículo, medida, región
- Michelin/BF Goodrich: Son marcas premium bajo pedido (equipo contacta en 2-4hs)

---

## 🎯 FLUJO TÍPICO

**Ejemplo 1: Cliente da medida**
```
1. Cliente: "Necesito 185/60R15 para mi Gol"
2. actualizar_estado({ medida: "185/60R15", vehiculo: "Gol" })  ← INMEDIATO
3. buscar_productos({ medida: "185/60R15" })
4. Enviar mensaje con cotización
5. actualizar_estado({ nuevo_estado: "cotizado" })  ← DESPUÉS de enviar
```

**Ejemplo 2: Cliente elige producto**
```
1. Cliente: "Quiero el Yokohama"
2. PREGUNTAR: "¿Cuántas cubiertas?" (⛔ NUNCA asumir)
3. Cliente: "Las 4"
4. buscar_productos() para validar precio actual
5. actualizar_estado({ producto, cantidad: 4, precio_final })
6. crear_ticket({ tipo: "pago_cuotas" }) si elige cuotas
```

**Ejemplo 3: Medida no disponible**
```
1. buscar_productos() → 0 resultados
2. crear_ticket({ tipo: "medida_no_disponible" })
3. Responder: "Ya consulté con compras, te contactan en 24-48hs"
```

**Ejemplo 4: Michelin (marca especial)**
```
1. Cliente: "Quiero Michelin Primacy"
2. crear_ticket({ tipo: "marca_especial", prioridad: "alta" })
3. Responder: "Marca premium bajo pedido, equipo te contacta en 2-4hs"
```

---

## ⚠️ ERRORES COMUNES A EVITAR

❌ **NO hacer:**
- Buscar productos sin medida
- Asumir cantidad (default 4)
- NO actualizar estado después de cada dato
- Confiar en precios que dice el cliente

✅ **SÍ hacer:**
- Actualizar INMEDIATAMENTE después de cada dato nuevo
- SIEMPRE preguntar cantidad explícitamente
- Validar con buscar_productos antes de pedido
- **Marcas en stock:** Yokohama, Hankook, LingLong, Laufenn, Nankang
- **Marcas especiales (ticket):** Michelin, BF Goodrich
- Usar precios EXACTOS de buscar_productos
