# 📊 Análisis de Base de Datos - TopNeum

**Fecha:** 15 de Noviembre 2025  
**Realizado por:** GitHub Copilot  
**Objetivo:** Identificar tablas redundantes y columnas innecesarias

---

## 🎯 Resumen Ejecutivo

### Hallazgos Principales:
- ✅ **1329 productos** en `products` (tabla principal en uso)
- ⚠️ **2 tablas VACÍAS** identificadas para eliminar: `leads_whatsapp`, `pedidos`
- ⚠️ **5 columnas redundantes** en `lead_pedidos` que duplican información
- 📦 **Espacio a liberar:** ~112 kB + simplificación de código

---

## 📋 Estado Actual de las Tablas

### ✅ Tablas en Uso Activo

| Tabla | Registros | Tamaño | Estado | Uso |
|-------|-----------|---------|---------|-----|
| **products** | 1329 | 864 kB | ✅ ACTIVA | Catálogo de neumáticos principal |
| **leads** | 1 | 176 kB | ✅ ACTIVA | Leads de WhatsApp |
| **lead_pedidos** | 1 | 64 kB | ✅ ACTIVA | Pedidos confirmados |
| **turnos** | 2 | 184 kB | ✅ ACTIVA | Turnos de colocación/retiro |
| **users** | ? | 48 kB | ✅ ACTIVA | Usuarios del sistema |
| **lead_consultas** | ? | 64 kB | ✅ ACTIVA | Consultas de leads |
| **lead_cotizaciones** | ? | 24 kB | ✅ ACTIVA | Cotizaciones enviadas |
| **lead_historial** | ? | 64 kB | ✅ ACTIVA | Historial de cambios |
| **lead_mensajes** | ? | 24 kB | ✅ ACTIVA | Mensajes WhatsApp |
| **lead_tickets** | ? | 24 kB | ✅ ACTIVA | Tickets de soporte |
| **horarios_disponibles** | ? | 48 kB | ✅ ACTIVA | Config de horarios |

### ❌ Tablas VACÍAS (Candidatas a Eliminación)

| Tabla | Registros | Tamaño | Problema | Acción Recomendada |
|-------|-----------|---------|----------|-------------------|
| **leads_whatsapp** | 0 | 80 kB | Duplica `leads` | 🗑️ ELIMINAR |
| **pedidos** | 0 | 32 kB | Nunca usada, sistema usa `lead_pedidos` | 🗑️ ELIMINAR |

---

## 🔍 Análisis Detallado

### 1. Tabla `leads_whatsapp` - REDUNDANTE ❌

**Problema:**
- Tiene 0 registros
- Duplica 100% la funcionalidad de la tabla `leads`
- Solo hay 3 referencias en código (n8n/webhooks) que no se usan

**Comparación de Columnas:**

| leads_whatsapp | leads | Comentario |
|---------------|-------|------------|
| `nombre` | `nombre_cliente` | ✅ Mismo dato |
| `telefono` | `telefono_whatsapp` | ✅ Mismo dato |
| `canal` | (implícito: whatsapp) | ❌ Innecesario, siempre es 'whatsapp' |
| `mensaje_inicial` | (en `lead_mensajes`) | ✅ Mejor arquitectura |
| `estado` | `estado` | ✅ Mismo concepto, enum diferente |
| `asignado_a` | `asignado_a` | ✅ Mismo dato |

**Referencias en Código:**
```
app/api/n8n/crear-lead/route.ts (línea 35)
app/api/webhooks/leads/whatsapp/route.ts (línea 15)
```

**Recomendación:** 🗑️ **ELIMINAR** y actualizar las 3 referencias para usar `leads`

---

### 2. Tabla `pedidos` - NUNCA USADA ❌

**Problema:**
- Tiene 0 registros
- Creada para pedidos manuales pero nunca implementado
- Sistema usa `lead_pedidos` exitosamente
- Solo 1 referencia en código que no funciona

**Estructura:**
```sql
CREATE TABLE pedidos (
  id uuid PRIMARY KEY,
  cliente_nombre text,
  cliente_telefono text,
  lead_id uuid REFERENCES leads_whatsapp(id), -- ⚠️ FK a tabla que se va a eliminar
  estado pedido_estado,
  direccion text,
  tipo_entrega tipo_entrega,
  items_total numeric(10,2),
  notas text
)
```

**Problema Adicional:**
- Tiene foreign key a `leads_whatsapp` (que también se va a eliminar)
- La página `app/pedidos/[id]/page.tsx` intentaba usarla pero la actualicé para usar `lead_pedidos`

**Recomendación:** 🗑️ **ELIMINAR** (ya no se usa)

---

### 3. Columnas Redundantes en `lead_pedidos` ⚠️

**Análisis de Uso:**

| Columna | Tiene Datos | Redundante Con | Acción |
|---------|-------------|----------------|--------|
| `productos` (jsonb) | ✅ Sí (1 reg) | - | ✅ **MANTENER** (principal) |
| `producto_descripcion` | ✅ Sí (1 reg) | `productos[].descripcion` | ✅ **MANTENER** (backup texto) |
| `producto_elegido_marca` | ❌ No (NULL) | `productos[].marca` | 🗑️ **ELIMINAR** |
| `producto_elegido_modelo` | ❌ No (NULL) | `productos[].modelo` | 🗑️ **ELIMINAR** |
| `producto_elegido_medida` | ❌ No (NULL) | `productos[].medida` | 🗑️ **ELIMINAR** |
| `producto_elegido_diseno` | ❌ No (NULL) | `productos[].diseno` | 🗑️ **ELIMINAR** |
| `precio_unitario` | ❌ No (NULL) | `productos[].precio_unitario` | 🗑️ **ELIMINAR** |
| `precio_final` | ✅ Sí (1 reg) | `total` | ✅ **MANTENER** (puede diferir) |

**Ejemplo de Datos Actuales:**
```json
{
  "productos": [{
    "sku": "YOKOHAMA-BLUEARTH-ES32-185/60R",
    "marca": "Yokohama",           // ← Ya está aquí
    "modelo": "BLUEARTH ES32",      // ← Ya está aquí
    "medida": "185/60R15",          // ← Ya está aquí
    "diseno": "BLUEARTH ES32",      // ← Ya está aquí
    "indice": "84H",
    "cantidad": 4,
    "precio_unitario": 121999.00,   // ← Ya está aquí
    "subtotal": 487996.00
  }],
  "producto_descripcion": "Yokohama BLUEARTH ES32 185/60R15 84H" // ← Backup OK
}
```

**Columnas a Mantener:**
- `productos` (jsonb): Estructura principal con array de productos
- `producto_descripcion` (text): Backup en texto plano útil para mensajes WhatsApp
- `precio_final`: Puede diferir del `total` si hubo descuentos negociados

**Recomendación:** 🗑️ **ELIMINAR** las 5 columnas `producto_elegido_*` y `precio_unitario`

---

## 🚨 Tabla Legacy: `productos` vs `products`

### Problema de Dualidad:

| Aspecto | `productos` (legacy) | `products` (nueva) |
|---------|---------------------|-------------------|
| **Registros** | ? (creada recientemente) | 1329 productos |
| **Referencias en código** | 19 archivos | ~5 archivos |
| **Columnas** | 14 columnas básicas | 20 columnas completas |
| **Índice (load index)** | ✅ Tiene | ✅ Tiene |
| **Precios** | Solo `precio_lista_base` | 7 precios (cuotas, efectivo, mayorista) |
| **Estado** | ⚠️ Legacy | ✅ Principal |

### Archivos que Usan `productos` (Legacy):

```
📁 app/api/productos/
  ├── route.ts (2 referencias)
  ├── import/route.ts (1 referencia) 
  ├── search/route.ts (1 referencia)
  ├── disponibilidad/route.ts (1 referencia)
  ├── comparar/route.ts (1 referencia)
  └── [id]/route.ts (2 referencias)

📁 app/catalogo/
  └── [id]/page.tsx (1 referencia)

📁 app/api/tarifas/
  └── preview/route.ts (1 referencia)
```

**Total:** 19 referencias que deberían migrar a `products`

---

## 📦 Plan de Acción Recomendado

### Fase 1: Limpieza Inmediata ⚡ (Ejecutar script SQL)

```bash
✅ Ejecutar script de limpieza (ya lo abrí en una pestaña)
```

**Acciones del script:**
1. 🗑️ DROP TABLE `leads_whatsapp` CASCADE
2. 🗑️ DROP TABLE `pedidos` CASCADE  
3. 🗑️ ALTER TABLE `lead_pedidos` DROP COLUMN producto_elegido_marca, ...
4. ✅ Agregar comentarios a columnas importantes
5. ✅ Verificar integridad de foreign keys

**Resultado esperado:**
- Espacio liberado: ~112 kB
- Columnas eliminadas: 5 de `lead_pedidos`
- Tablas eliminadas: 2
- Foreign keys rotas: 0 (se eliminan en CASCADE)

---

### Fase 2: Migración de Código 🔧 (Trabajo manual)

#### A. Actualizar Referencias a `leads_whatsapp` → `leads`

**Archivos a modificar (3):**

1. `app/api/n8n/crear-lead/route.ts`
   ```typescript
   // ANTES:
   FROM leads_whatsapp WHERE telefono = ${telefono}
   
   // DESPUÉS:
   FROM leads WHERE telefono_whatsapp = ${telefono}
   ```

2. `app/api/webhooks/leads/whatsapp/route.ts`
   ```typescript
   // ANTES:
   SELECT id FROM leads_whatsapp WHERE telefono = ${telefono}
   
   // DESPUÉS:
   SELECT id FROM leads WHERE telefono_whatsapp = ${telefono}
   ```

---

#### B. Migrar `productos` → `products` (19 archivos)

**Estrategia:**
1. Buscar y reemplazar global: `FROM productos` → `FROM products`
2. Buscar y reemplazar global: `INTO productos` → `INTO products`
3. Mapear nombres de columnas:
   - `codigo` → `sku`
   - `precio_lista_base` → `cuota_3 * 3` (o calcular según lógica)
   - `activo` → (agregar columna o usar lógica de `stock`)

**Archivos prioritarios:**
- ✅ `app/api/productos/import/route.ts` - Ya usa ambas tablas
- ⚠️ `app/api/productos/route.ts` - Migrar a `products`
- ⚠️ `app/api/productos/search/route.ts` - Migrar a `products`
- ⚠️ `app/catalogo/[id]/page.tsx` - Migrar a `products`

**Después de migrar TODO el código:**
```sql
-- Eliminar tabla legacy
DROP TABLE productos CASCADE;
```

---

### Fase 3: Optimización Post-Limpieza 🚀

#### Índices Recomendados

```sql
-- Mejorar búsquedas en products
CREATE INDEX IF NOT EXISTS idx_products_marca_medida 
  ON products(marca, medida);

CREATE INDEX IF NOT EXISTS idx_products_stock_activo 
  ON products(tiene_stock) WHERE tiene_stock = true;

CREATE INDEX IF NOT EXISTS idx_products_familia_marca 
  ON products(familia, marca);

-- Mejorar JOIN con lead_pedidos
CREATE INDEX IF NOT EXISTS idx_lead_pedidos_lead_id 
  ON lead_pedidos(lead_id);

-- Mejorar búsquedas de turnos por lead
CREATE INDEX IF NOT EXISTS idx_turnos_lead_fecha 
  ON turnos(lead_id, fecha);
```

#### VACUUM y ANALYZE

```sql
-- Recuperar espacio después de eliminar tablas/columnas
VACUUM FULL lead_pedidos;
VACUUM FULL leads;

-- Actualizar estadísticas del query planner
ANALYZE products;
ANALYZE lead_pedidos;
ANALYZE leads;
```

---

## 📊 Métricas Esperadas

### Antes de Limpieza:
- Tablas totales: 13
- Columnas en lead_pedidos: 24
- Espacio total: ~1.7 MB
- Complejidad: Alta (tablas duplicadas)

### Después de Limpieza:
- Tablas totales: 11 (-2)
- Columnas en lead_pedidos: 19 (-5)
- Espacio total: ~1.59 MB (-112 kB)
- Complejidad: Media (una tabla legacy `productos` pendiente)

### Después de Migración Completa:
- Tablas totales: 10 (-3 total)
- Uso de `products` como única tabla de productos
- Complejidad: Baja (arquitectura simplificada)

---

## ⚠️ Precauciones

### Antes de Ejecutar el Script:

1. ✅ **Backup de la base de datos** (recomendado aunque las tablas estén vacías)
   ```bash
   # Usar herramienta de Neon para crear snapshot
   ```

2. ✅ **Verificar que NO hay datos importantes:**
   ```sql
   SELECT COUNT(*) FROM leads_whatsapp; -- Debe dar 0
   SELECT COUNT(*) FROM pedidos;        -- Debe dar 0
   ```

3. ⚠️ **Notificar al equipo** si hay otros desarrolladores

4. ✅ **Ejecutar en horario de bajo tráfico**

### Durante la Ejecución:

- El script usa `CASCADE` para eliminar foreign keys automáticamente
- No afecta datos de producción (las tablas están vacías)
- Operación reversible si hiciste backup

### Después de la Ejecución:

1. Verificar que no hay errores en la app:
   ```bash
   # Revisar logs de Next.js
   npm run dev
   ```

2. Probar funcionalidad de pedidos:
   - Ver lista de pedidos: `/pedidos`
   - Ver detalle de pedido: `/pedidos/[id]`
   - Crear nuevo lead
   - Confirmar pedido

3. Verificar consultas SQL en la app funcionen

---

## 🎓 Lecciones Aprendidas

### Buenas Prácticas Aplicadas:

1. ✅ **Columnas JSONB** para datos flexibles (`productos` en `lead_pedidos`)
2. ✅ **Triggers automáticos** para `updated_at`
3. ✅ **Foreign keys con CASCADE** para integridad referencial
4. ✅ **Comentarios en columnas** para documentación

### Anti-Patrones Identificados:

1. ❌ **Duplicación de tablas** (`leads` + `leads_whatsapp`)
2. ❌ **Columnas redundantes** (datos en jsonb Y en columnas separadas)
3. ❌ **Tablas nunca usadas** (`pedidos` creada pero nunca poblada)
4. ❌ **Dos tablas para el mismo concepto** (`productos` + `products`)

### Recomendaciones para el Futuro:

1. 📋 **Planificar schema antes de crear tablas**
2. 🧹 **Revisar uso de tablas mensualmente**
3. 📝 **Documentar decisiones de diseño** (como este análisis)
4. 🔍 **Usar migrations con control de versiones**
5. ⚡ **Crear índices desde el inicio** en columnas de búsqueda frecuente

---

## 📞 Soporte

Si tenés dudas sobre este análisis o necesitás ayuda con la ejecución:

1. Revisá el script SQL (ya está abierto en una pestaña)
2. Hacé pruebas en entorno de desarrollo primero
3. Consultá los comentarios en el script para entender cada paso

---

**Generado el:** 15 de Noviembre 2025  
**Versión:** 1.0  
**Estado:** ✅ Listo para ejecutar Fase 1
