# Credenciales y Testing - Guía de Setup

## Cuentas de prueba

### Base de datos
```bash
# Staging (Neon)
DATABASE_URL=postgresql://usuario:password@staging-db.neon.tech/topneum_staging

# Testing (local)
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/topneum_test
```

### Usuarios de prueba creados

#### Admin
- **Email:** `admin@topneum.com`
- **Password:** `Admin2025!` (cambiar en producción)
- **Role:** `admin`
- **Permisos:** Acceso completo

#### Vendedor 1
- **Email:** `vendedor1@topneum.com`
- **Password:** `Vendedor2025!`
- **Role:** `vendedor`
- **Permisos:** Ver/editar leads, crear cotizaciones, ver pedidos

#### Vendedor 2
- **Email:** `vendedor2@topneum.com`
- **Password:** `Vendedor2025!`
- **Role:** `vendedor`

#### Testing (automatizado)
- **Email:** `test@topneum.com`
- **Password:** `Test2025!`
- **Role:** `admin`
- **Uso:** Solo para scripts E2E

## Cambiar credenciales

### Script SQL para actualizar passwords

```sql
-- Cambiar password de admin
UPDATE users 
SET password = crypt('NuevoPasswordSeguro2025!', gen_salt('bf'))
WHERE email = 'admin@topneum.com';

-- Crear nuevo usuario vendedor
INSERT INTO users (nombre, email, password, role, activo, created_at)
VALUES (
  'Juan Pérez',
  'juan.perez@topneum.com',
  crypt('JuanPassword2025!', gen_salt('bf')),
  'vendedor',
  true,
  NOW()
);

-- Desactivar usuario de testing en producción
UPDATE users 
SET activo = false
WHERE email = 'test@topneum.com';
```

### Variables de entorno por ambiente

**`.env.local` (desarrollo):**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/topneum_dev
JWT_SECRET=dev-secret-key-change-in-production
NEXTAUTH_SECRET=nextauth-dev-secret
NEXTAUTH_URL=http://localhost:3000

EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=dev-evolution-key
```

**`.env.staging`:**
```bash
DATABASE_URL=postgresql://usuario:password@staging-db.neon.tech/topneum_staging
JWT_SECRET=staging-secret-12345-change-me
NEXTAUTH_SECRET=nextauth-staging-secret-67890
NEXTAUTH_URL=https://staging.topneum.com

EVOLUTION_API_URL=https://evolution-staging.topneum.com
EVOLUTION_API_KEY=staging-evolution-key-secure
```

**`.env.production`:**
```bash
DATABASE_URL=postgresql://usuario:password@prod-db.neon.tech/topneum_prod
JWT_SECRET=CAMBIAR-POR-HASH-SEGURO-256-BITS
NEXTAUTH_SECRET=CAMBIAR-POR-HASH-NEXTAUTH-SEGURO
NEXTAUTH_URL=https://app.topneum.com

# API Oficial (cuando se migre)
WHATSAPP_BUSINESS_PHONE_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

## Testing manual - Checklist

### 1. Login y autenticación
```bash
# Test 1: Login exitoso
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@topneum.com","password":"Admin2025!"}'

# Test 2: Login fallido (credenciales incorrectas)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@topneum.com","password":"wrong"}'

# Test 3: Verificar sesión
curl http://localhost:3000/api/auth/me \
  -H "Cookie: auth-token=TOKEN_OBTENIDO"

# Test 4: Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: auth-token=TOKEN_OBTENIDO"
```

### 2. Flujo de leads
- [ ] Crear lead desde UI
- [ ] Crear lead desde webhook
- [ ] Ver lead en kanban
- [ ] Mover lead entre columnas (drag & drop)
- [ ] Abrir panel de detalles
- [ ] Editar notas del lead
- [ ] Crear consulta
- [ ] Crear cotización

### 3. Tickets
- [ ] Crear ticket manual desde UI
- [ ] Crear ticket desde API
- [ ] Filtrar por estado
- [ ] Filtrar por prioridad
- [ ] Cambiar estado (abierto → en revisión → resuelto)
- [ ] Eliminar ticket

### 4. Pedidos
- [ ] Ver lista de pedidos
- [ ] Abrir detalle de pedido
- [ ] Verificar datos de cliente desde turnos
- [ ] Verificar tracking de envío (si aplica)

### 5. Permisos por rol
- [ ] Admin puede acceder a todas las secciones
- [ ] Vendedor NO puede acceder a configuración
- [ ] Usuario inactivo NO puede hacer login

## Scripts de inicialización

### Seed data para testing
`scripts/seed-test-data.sql`:
```sql
-- Limpiar datos de prueba anteriores
DELETE FROM lead_tickets WHERE lead_id IN (SELECT id FROM leads WHERE telefono_whatsapp LIKE '+54934165%');
DELETE FROM lead_cotizaciones WHERE lead_id IN (SELECT id FROM leads WHERE telefono_whatsapp LIKE '+54934165%');
DELETE FROM lead_consultas WHERE lead_id IN (SELECT id FROM leads WHERE telefono_whatsapp LIKE '+54934165%');
DELETE FROM turnos WHERE lead_id IN (SELECT id FROM leads WHERE telefono_whatsapp LIKE '+54934165%');
DELETE FROM lead_pedidos WHERE lead_id IN (SELECT id FROM leads WHERE telefono_whatsapp LIKE '+54934165%');
DELETE FROM leads WHERE telefono_whatsapp LIKE '+54934165%';

-- Crear leads de prueba
INSERT INTO leads (telefono_whatsapp, nombre_cliente, region, estado, origen, created_at, ultima_interaccion)
VALUES
  ('+5493416555001', 'Test Cliente 1', 'ROSARIO', 'nuevo', 'whatsapp', NOW(), NOW()),
  ('+5493416555002', 'Test Cliente 2', 'INTERIOR', 'en_conversacion', 'whatsapp', NOW(), NOW()),
  ('+5493416555003', 'Test Cliente 3', 'ROSARIO', 'cotizado', 'whatsapp', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour');

-- Crear consultas
INSERT INTO lead_consultas (lead_id, medida_neumatico, marca_preferida, tipo_vehiculo, cantidad, created_at)
SELECT id, '205/55 R16', 'Michelin', 'Fiat Cronos', 4, NOW()
FROM leads WHERE telefono_whatsapp = '+5493416555002';

-- Crear cotización
INSERT INTO lead_cotizaciones (lead_id, productos_mostrados, precio_total_contado, precio_total_3cuotas, region, created_at)
SELECT id, 
  '[{"descripcion":"Michelin Energy XM2+ 205/55 R16","precio":112000,"cantidad":4}]'::jsonb,
  448000,
  470000,
  'ROSARIO',
  NOW()
FROM leads WHERE telefono_whatsapp = '+5493416555003';
```

Ejecutar:
```bash
psql $DATABASE_URL_TEST -f scripts/seed-test-data.sql
```

## Monitoreo y logs

### Ver logs en tiempo real (producción)
```bash
# Vercel logs
vercel logs --follow

# O desde dashboard
https://vercel.com/tu-org/topneum/logs
```

### Queries útiles para debugging
```sql
-- Ver últimos leads creados
SELECT id, nombre_cliente, telefono_whatsapp, estado, created_at 
FROM leads 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver tickets abiertos
SELECT t.id, t.tipo, t.prioridad, l.nombre_cliente, t.created_at
FROM lead_tickets t
JOIN leads l ON l.id = t.lead_id
WHERE t.estado = 'abierto'
ORDER BY t.prioridad, t.created_at;

-- Ver pedidos sin pagar
SELECT p.id, l.nombre_cliente, p.total, p.estado_pago, p.created_at
FROM lead_pedidos p
JOIN leads l ON l.id = p.lead_id
WHERE p.estado_pago IN ('pendiente', 'pago_informado')
ORDER BY p.created_at DESC;
```

## Rotación de credenciales (cada 3 meses)

1. Generar nuevos secrets:
```bash
# JWT Secret (256 bits)
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32
```

2. Actualizar en Vercel/hosting:
```bash
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
```

3. Actualizar passwords de usuarios administrativos

4. Rotar API keys de Evolution API / WhatsApp Business

## Contacto de emergencia
- **Admin principal:** admin@topneum.com
- **Soporte técnico:** soporte@topneum.com
- **Reset password:** Contactar admin con email corporativo verificado
