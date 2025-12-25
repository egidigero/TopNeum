# 📋 Reglas del Agente - Manejo de Cantidad

## ⚠️ REGLA CRÍTICA: No preguntar datos que ya tenés

### Flujo correcto de cantidad:

#### 1️⃣ Durante la consulta inicial
- Cliente: "Necesito 4 cubiertas 185/65R15 Yokohama"
- Agente: Guarda en `lead_consultas`:
  - `medida_neumatico`: "185/65R15"
  - `marca_preferida`: "Yokohama"
  - `cantidad`: 4 ✅

#### 2️⃣ Al confirmar el pedido

**✅ CORRECTO - Si ya tenés la cantidad:**
```
Cliente: "Me llevo esas en 3 cuotas"
Agente: "Perfecto! Te confirmo el pedido:
         - 4 cubiertas Yokohama BLUEARTH 185/65R15
         - 3 cuotas de $54,999
         - Total: $164,997
         ¿Confirmás el pedido?"
```

**❌ INCORRECTO - NO hacer esto:**
```
Cliente: "Me llevo esas en 3 cuotas"
Agente: "¿Cuántas cubiertas querés?" 👈 ¡MAL! Ya lo sabés
```

#### 3️⃣ Si NO tenés la cantidad

**✅ CORRECTO - Preguntar solo si es NULL:**
```
Cliente: "Necesito 185/65R15 Yokohama" (sin cantidad)
Agente: [guarda consulta con cantidad = NULL]
---
Cliente: "Me gustan esas"
Agente: "Genial! ¿Cuántas cubiertas necesitás? (generalmente son 2 o 4)"
```

## 🔍 Cómo verificar en la memoria

Cuando usás `/api/leads/buscar`, obtenés:
```json
{
  "lead": {
    "consultas": [
      {
        "medida_neumatico": "185/65R15",
        "cantidad": 4  // 👈 Si existe, USALO
      }
    ]
  }
}
```

## 📝 Checklist para el agente

Antes de confirmar pedido:
- [ ] Revisar `consultas[].cantidad`
- [ ] Si existe → Usar ese valor directamente
- [ ] Si es NULL → Preguntar cantidad
- [ ] Confirmar con el cliente el resumen completo
- [ ] Crear pedido con `/api/n8n/actualizar-estado`

## 💡 Beneficio

- ✅ Experiencia más fluida
- ✅ No repetir preguntas
- ✅ Cliente siente que lo recordás
- ✅ Menos mensajes = conversión más rápida
