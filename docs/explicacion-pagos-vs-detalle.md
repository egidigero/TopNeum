# 📊 Diferencia entre "Detalle de Compra" y "Pagos"

## 🛒 Detalle de Compra (Top del Panel)

**Qué es:**
Es un **resumen visual** del pedido que el cliente eligió. Muestra la información más importante de forma destacada para que veas rápido qué quiere comprar el cliente.

**Información que muestra:**
- ✅ Producto elegido (descripción completa)
- ✅ Cantidad total
- ✅ Precio TOTAL del pedido
- ✅ Forma de pago que eligió
- ✅ Estado del pedido (esperando pago, pago informado, confirmado)
- ✅ Botón para confirmar pago (si corresponde)

**De dónde viene:**
Se obtiene directamente de la tabla `leads`:
```typescript
lead.producto_descripcion  // "LW31 LAUFENN 205/55R16 (2) + LH41 LAUFENN 185/60R15 (2)"
lead.cantidad              // 4
lead.precio_final          // 413996
lead.forma_pago_detalle    // "Contado: $413.996"
```

**Cuándo aparece:**
Cuando el lead está en estado `esperando_pago`, `pago_informado` o `pedido_confirmado`.

**Ejemplo visual:**
```
┌─────────────────────────────────────────┐
│ 🛒 Detalle de Compra                    │
├─────────────────────────────────────────┤
│ Producto elegido:                       │
│ LW31 LAUFENN 205/55R16 (2) +            │
│ LH41 LAUFENN 185/60R15 (2)              │
│                                         │
│ Cantidad: 4 unidades                    │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│ TOTAL: $ 413.996                        │
│                                         │
│ Forma de pago: Contado                  │
│                                         │
│ [⏳ Esperando pago del cliente]         │
└─────────────────────────────────────────┘
```

---

## 💳 Pagos (Sección más abajo)

**Qué es:**
Es un **historial de PEDIDOS** que se guardaron en la base de datos. Muestra TODOS los pedidos que se registraron para este lead (puede haber múltiples si el cliente cambió de opinión, o si hizo varios pedidos diferentes).

**Información que muestra por cada pago:**
- ✅ Producto completo con medida
- ✅ Cantidad de unidades
- ✅ Precio total del pedido
- ✅ Forma de pago elegida
- ✅ Estado del pago (pendiente/confirmado/rechazado)
- ✅ Fecha en que se creó el pedido

**De dónde viene:**
Se obtiene de la tabla `lead_pedidos` (pueden ser varios registros):
```typescript
// Consulta SQL
SELECT * FROM lead_pedidos WHERE lead_id = '123'

// Puede devolver múltiples filas:
[
  {
    id: 1,
    producto_descripcion: "LW31 LAUFENN 205/55R16 x2",
    cantidad_total: 2,
    precio_final: 215998,
    forma_pago_detalle: "3 cuotas",
    estado_pago: "pendiente",
    created_at: "2025-11-16"
  },
  {
    id: 2,
    producto_descripcion: "LW31 LAUFENN 205/55R16 (2) + LH41 LAUFENN 185/60R15 (2)",
    cantidad_total: 4,
    precio_final: 413996,
    forma_pago_detalle: "Contado",
    estado_pago: "confirmado",
    created_at: "2025-11-16"
  }
]
```

**Cuándo aparece:**
Siempre que hay registros en la tabla `lead_pedidos` para ese lead.

**Ejemplo visual:**
```
┌─────────────────────────────────────────┐
│ 💳 Pagos [2]                            │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────┐     │
│ │ Producto:                       │     │
│ │ LW31 LAUFENN 205/55R16 x2      │     │
│ │                                 │     │
│ │ 2 unidades      $ 215.998       │     │
│ │ 💳 3 cuotas                     │     │
│ │                                 │     │
│ │ 15/11/2025      [pendiente]     │     │
│ └─────────────────────────────────┘     │
│                                         │
│ ┌─────────────────────────────────┐     │
│ │ Producto:                       │     │
│ │ LW31 LAUFENN 205/55R16 (2) +    │     │
│ │ LH41 LAUFENN 185/60R15 (2)      │     │
│ │                                 │     │
│ │ 4 unidades      $ 413.996       │     │
│ │ 💳 Contado                      │     │
│ │                                 │     │
│ │ 16/11/2025      [confirmado]    │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

---

## 🔄 ¿Cuándo se crea cada uno?

### **Detalle de Compra**
Se actualiza en la tabla `leads` cuando el agente llama:
```javascript
actualizar_estado({
  producto_descripcion: "...",
  cantidad: 4,
  precio_final: 413996,
  forma_pago_detalle: "Contado"
})
```

### **Pago (entrada en historial)**
Se crea una **nueva fila** en `lead_pedidos` cuando el agente envía `producto_descripcion` por primera vez. Si el cliente cambia el pedido, se **actualiza la misma fila** (no crea una nueva).

---

## 🎯 ¿Por qué hay dos?

### **Detalle de Compra = Vista rápida del pedido ACTUAL**
- Es como un "carrito de compra"
- Muestra lo que el cliente eligió AHORA
- Se actualiza cuando el cliente cambia de opinión
- Siempre muestra 1 solo pedido (el más reciente)

### **Pagos = Historial COMPLETO de pedidos**
- Es como un "registro contable"
- Muestra TODOS los pedidos que se hicieron
- Útil para auditoría y seguimiento
- Puede tener múltiples entradas si:
  - El cliente hizo varios pedidos separados
  - El cliente cambió el pedido (aunque en tu caso se actualiza, no se crea uno nuevo)

---

## 📋 Resumen para tu caso

**Según tu imagen:**
- **Detalle de Compra** muestra: "LW31 + LH41 (4 unidades) - $413.996 - Contado"
- **Pagos** debe mostrar: Debajo, el mismo pedido con más detalle (producto, cantidades, fecha, estado)

**Si el contador dice [1]:**
Significa que hay **1 pedido registrado** en la tabla `lead_pedidos` para este lead.

**Si dice [0] o "Sin pagos registrados":**
Significa que el agente NO llamó `actualizar_estado` con `producto_descripcion` todavía, o hay un error en cómo se guarda.

---

## 🔧 Solución aplicada hoy

1. ✅ Actualicé la API `/api/leads/[id]/pagos` para traer los campos nuevos
2. ✅ Actualicé el componente para mostrar correctamente:
   - Producto con medida
   - Cantidad por producto
   - Precio unitario y total
   - Forma de pago
   - Estado y fecha
3. ✅ Actualicé el prompt para que el agente guarde el detalle completo en `notas`

**Ahora ambas secciones mostrarán la información correcta! 🎉**
