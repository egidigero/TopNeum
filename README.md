# Sistema de Gestión de Neumáticos

Sistema full-stack para gestión de ventas, stock, clientes WhatsApp y pedidos de neumáticos.

## Características

- **Autenticación**: Sistema de login con roles (Admin, Ventas, Finanzas)
- **Catálogo**: Gestión de productos con motor de precios automático
- **Tarifas**: Configuración de márgenes, recargos y descuentos
- **Leads WhatsApp**: Kanban board para seguimiento de clientes
- **Pedidos**: Gestión completa de órdenes con timeline de estados
- **Gastos**: Registro y control de gastos operativos
- **Webhooks N8n**: Integración con automatizaciones externas

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Base de datos**: Neon (PostgreSQL)
- **Autenticación**: JWT con cookies httpOnly
- **UI**: shadcn/ui + Tailwind CSS v4
- **Tipado**: TypeScript

## Variables de Entorno

\`\`\`env
# Database (Neon) - YA CONFIGURADO AUTOMÁTICAMENTE ✅
# Las variables de Neon ya están disponibles en el proyecto

# JWT Secret - OPCIONAL (tiene valor por defecto para desarrollo)
# En producción, agregar una clave secreta única:
JWT_SECRET=tu-clave-secreta-super-larga-y-aleatoria-minimo-32-caracteres

# N8n Webhooks - OPCIONAL (dejar para después)
# Cuando configures N8n, agregar la URL del webhook:
# N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/...
\`\`\`

### ¿Qué es JWT_SECRET?

Es una clave secreta para firmar los tokens de autenticación (las "sesiones" de usuarios). 

- **Para desarrollo**: Ya tiene un valor por defecto, no necesitas configurar nada
- **Para producción**: Debes agregar tu propia clave secreta (mínimo 32 caracteres aleatorios)
- **Ejemplo**: `mi-empresa-neumaticos-2024-produccion-secret-key-12345`

## Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. **Las variables de Neon ya están configuradas** ✅
4. Ejecutar scripts SQL en orden desde la UI de v0:
   - `scripts/001-create-schema.sql`
   - `scripts/002-create-pricing-view.sql`
   - `scripts/003-seed-data.sql`
5. Iniciar desarrollo: `npm run dev`

## Usuarios de Prueba

Después de ejecutar los scripts SQL, puedes usar:

- **Admin**: admin@neumaticos.com / admin123
- **Ventas**: ventas@neumaticos.com / admin123
- **Finanzas**: finanzas@neumaticos.com / admin123

## Webhooks N8n (Configurar después)

### Webhooks Entrantes (para escribir en la app)

**POST /api/webhooks/leads/whatsapp**
Crea o actualiza un lead desde WhatsApp
\`\`\`json
{
  "nombre": "Juan Pérez",
  "telefono": "+5491123456789",
  "mensaje_inicial": "Hola, necesito cubiertas",
  "origen": "Instagram Ad",
  "canal": "whatsapp"
}
\`\`\`

**POST /api/webhooks/pagos/reportados**
Registra un pago reportado
\`\`\`json
{
  "lead_id": "uuid",
  "metodo": "transferencia",
  "monto_reportado": 150000,
  "comprobante_url": "https://...",
  "notas": "Transferencia Banco X"
}
\`\`\`

**POST /api/webhooks/stock/update**
Actualiza stock de un producto
\`\`\`json
{
  "codigo": "MICH-PRIM4-205-55-16",
  "stock": 15
}
\`\`\`

### Webhooks Salientes (eventos que dispara la app)

Cuando configures `N8N_WEBHOOK_URL`, la app enviará webhooks automáticamente para estos eventos:

- `LEAD_NUEVO`: Nuevo lead creado
- `LEAD_ESTADO_CAMBIO`: Cambio de estado en lead
- `PAGO_REPORTADO`: Nuevo pago reportado
- `PAGO_VERIFICADO`: Pago verificado por finanzas
- `PEDIDO_NUEVO`: Nuevo pedido creado
- `PEDIDO_ESTADO_CAMBIO`: Cambio de estado en pedido

**Nota**: Si N8N_WEBHOOK_URL no está configurado, los webhooks salientes simplemente no se envían (no genera errores).

## Estructura de Precios

El sistema calcula automáticamente todos los precios basándose en:

1. **Costo** (ingresado manualmente)
2. **Precio Lista** = Costo × Jitter [1.8-2.2] (redondeado)
3. **Precio Online** = Lista × (1 + Margen Online)
4. **Precios en Cuotas** = Online × (1 + Recargo 3/6/12)
5. **Efectivo sin IVA** = (Online / (1 + IVA)) × (1 - Descuento CABA/Interior)
6. **Mayorista** = Costo × (1 + Margen C/F o S/F)

## Roles y Permisos

- **Admin**: Acceso completo, ve costos, gestiona tarifas
- **Ventas**: Catálogo (sin costos), leads, pedidos
- **Finanzas**: Verificación de pagos, gastos

## Licencia

Propietario
