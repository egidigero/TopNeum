-- Tire Management System - Database Schema
-- Version 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE canal_type AS ENUM ('whatsapp', 'instagram', 'otro');
CREATE TYPE lead_estado AS ENUM (
  'nuevo',
  'contactado',
  'cotizado',
  'esperando_pago',
  'pagado_pendiente_verificacion',
  'pago_verificado',
  'convertido_a_pedido',
  'perdido'
);
CREATE TYPE metodo_pago AS ENUM ('transferencia', 'mp', 'efectivo');
CREATE TYPE pago_estado AS ENUM ('reportado', 'verificado', 'rechazado');
CREATE TYPE pedido_estado AS ENUM (
  'pendiente_preparacion',
  'preparado',
  'despachado',
  'entregado',
  'cancelado'
);
CREATE TYPE tipo_entrega AS ENUM ('retiro', 'envio_caba', 'envio_interior');
CREATE TYPE user_role AS ENUM ('admin', 'ventas', 'finanzas');

-- Users table (simple auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ventas',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Productos table
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca TEXT NOT NULL,
  diseno TEXT NOT NULL,
  modelo TEXT NOT NULL,
  medida TEXT NOT NULL,
  descripcion_larga TEXT GENERATED ALWAYS AS (medida || ' ' || diseno || ' ' || marca) STORED,
  codigo TEXT UNIQUE NOT NULL,
  precio_lista_base NUMERIC(10, 2),
  costo NUMERIC(10, 2) NOT NULL CHECK (costo >= 0),
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_marca ON productos(marca);
CREATE INDEX idx_productos_activo ON productos(activo);

-- 2. Tarifas table
CREATE TABLE tarifas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  vigente BOOLEAN DEFAULT true,
  jitter_min NUMERIC(5, 2) DEFAULT 1.8,
  jitter_max NUMERIC(5, 2) DEFAULT 2.2,
  redondeo_lista_a INTEGER DEFAULT 1000,
  iva NUMERIC(5, 2) DEFAULT 0.21,
  redondeo_venta_a INTEGER DEFAULT 100,
  margen_online NUMERIC(5, 2) DEFAULT 0.25,
  recargo_3 NUMERIC(5, 2) DEFAULT 0.00,
  recargo_6 NUMERIC(5, 2) DEFAULT 0.06,
  recargo_12 NUMERIC(5, 2) DEFAULT 0.18,
  desc_cash_caba NUMERIC(5, 2) DEFAULT 0.10,
  desc_cash_interior NUMERIC(5, 2) DEFAULT 0.12,
  margen_mayorista_cf NUMERIC(5, 2) DEFAULT 0.15,
  margen_mayorista_sf NUMERIC(5, 2) DEFAULT 0.12,
  vigente_desde DATE,
  vigente_hasta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one tarifa is vigente at a time
CREATE UNIQUE INDEX idx_tarifas_vigente ON tarifas(vigente) WHERE vigente = true;

-- 3. Leads WhatsApp table
CREATE TABLE leads_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  canal canal_type DEFAULT 'whatsapp',
  mensaje_inicial TEXT,
  origen TEXT,
  estado lead_estado DEFAULT 'nuevo',
  asignado_a UUID REFERENCES users(id),
  ultimo_contacto_at TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_telefono ON leads_whatsapp(telefono);
CREATE INDEX idx_leads_estado ON leads_whatsapp(estado);
CREATE INDEX idx_leads_asignado ON leads_whatsapp(asignado_a);

-- 4. Pedidos table
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  lead_id UUID REFERENCES leads_whatsapp(id),
  estado pedido_estado DEFAULT 'pendiente_preparacion',
  direccion TEXT,
  tipo_entrega tipo_entrega,
  items_total NUMERIC(10, 2) DEFAULT 0,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_lead ON pedidos(lead_id);

-- 5. Pagos table
CREATE TABLE pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads_whatsapp(id),
  pedido_id UUID REFERENCES pedidos(id),
  metodo metodo_pago NOT NULL,
  monto_reportado NUMERIC(10, 2) NOT NULL,
  comprobante_url TEXT,
  estado pago_estado DEFAULT 'reportado',
  verificado_por UUID REFERENCES users(id),
  verificado_at TIMESTAMPTZ,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pagos_lead ON pagos(lead_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- 6. Pedido Items table
CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);

-- 7. Gastos table
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  medio_pago TEXT,
  comprobante_url TEXT,
  creado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_categoria ON gastos(categoria);

-- 8. Logs Auditoria table
CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id),
  entidad TEXT NOT NULL,
  entidad_id UUID NOT NULL,
  accion TEXT NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_entidad ON logs_auditoria(entidad, entidad_id);
CREATE INDEX idx_logs_actor ON logs_auditoria(actor_user_id);
CREATE INDEX idx_logs_created ON logs_auditoria(created_at);

-- Helper function: redondear_a
CREATE OR REPLACE FUNCTION redondear_a(valor NUMERIC, multiplo NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(valor / multiplo) * multiplo;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarifas_updated_at BEFORE UPDATE ON tarifas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads_whatsapp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pagos_updated_at BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
