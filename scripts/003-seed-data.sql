-- Seed data for testing

-- Insert default admin user (password: admin123 - hashed with bcrypt)
INSERT INTO users (email, nombre, role, password_hash) VALUES
('admin@neumaticos.com', 'Administrador', 'admin', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z'),
('ventas@neumaticos.com', 'Vendedor', 'ventas', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z'),
('finanzas@neumaticos.com', 'Finanzas', 'finanzas', '$2a$10$rKZvVqVvVqVvVqVvVqVvVeJ3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z3Z');

-- Insert default tarifa
INSERT INTO tarifas (
  nombre, 
  vigente, 
  vigente_desde,
  jitter_min,
  jitter_max,
  redondeo_lista_a,
  iva,
  redondeo_venta_a,
  margen_online,
  recargo_3,
  recargo_6,
  recargo_12,
  desc_cash_caba,
  desc_cash_interior,
  margen_mayorista_cf,
  margen_mayorista_sf
) VALUES (
  'Tarifa Base 2025',
  true,
  CURRENT_DATE,
  1.8,
  2.2,
  1000,
  0.21,
  100,
  0.25,
  0.00,
  0.06,
  0.18,
  0.10,
  0.12,
  0.15,
  0.12
);

-- Insert sample productos
INSERT INTO productos (marca, diseno, modelo, medida, codigo, costo, stock, precio_lista_base) VALUES
('Michelin', 'Primacy', '4', '205/55R16', 'MICH-PRIM4-205-55-16', 85000, 12, NULL),
('Bridgestone', 'Turanza', 'T005', '225/45R17', 'BRID-TUR-T005-225-45-17', 95000, 8, NULL),
('Pirelli', 'Cinturato', 'P7', '195/65R15', 'PIRE-CINT-P7-195-65-15', 72000, 15, NULL),
('Goodyear', 'EfficientGrip', 'Performance', '215/60R16', 'GOOD-EFFI-PERF-215-60-16', 78000, 10, NULL),
('Continental', 'PremiumContact', '6', '235/50R18', 'CONT-PREM-6-235-50-18', 110000, 6, NULL);

-- Insert sample lead
INSERT INTO leads_whatsapp (nombre, telefono, canal, mensaje_inicial, origen, estado) VALUES
('Juan Pérez', '+5491123456789', 'whatsapp', 'Hola, necesito 4 cubiertas 205/55R16', 'Instagram Ad', 'nuevo');
