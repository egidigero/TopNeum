-- Pricing calculation view
-- This view calculates all prices based on the active tarifa

CREATE OR REPLACE VIEW precios_calculados AS
SELECT 
  p.id AS producto_id,
  p.codigo,
  p.marca,
  p.diseno,
  p.modelo,
  p.medida,
  p.costo,
  p.stock,
  t.id AS tarifa_id,
  t.nombre AS tarifa_nombre,
  
  -- Precio lista (base or calculated with jitter)
  CASE 
    WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
    ELSE redondear_a(
      p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
      t.redondeo_lista_a
    )
  END AS precio_lista,
  
  -- Precio online base
  redondear_a(
    CASE 
      WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
      ELSE redondear_a(
        p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
        t.redondeo_lista_a
      )
    END * (1 + t.margen_online),
    t.redondeo_venta_a
  ) AS precio_online_base,
  
  -- Precios en cuotas
  redondear_a(
    redondear_a(
      CASE 
        WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
        ELSE redondear_a(
          p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
          t.redondeo_lista_a
        )
      END * (1 + t.margen_online),
      t.redondeo_venta_a
    ) * (1 + t.recargo_3),
    t.redondeo_venta_a
  ) AS precio_3_cuotas,
  
  redondear_a(
    redondear_a(
      CASE 
        WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
        ELSE redondear_a(
          p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
          t.redondeo_lista_a
        )
      END * (1 + t.margen_online),
      t.redondeo_venta_a
    ) * (1 + t.recargo_6),
    t.redondeo_venta_a
  ) AS precio_6_cuotas,
  
  redondear_a(
    redondear_a(
      CASE 
        WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
        ELSE redondear_a(
          p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
          t.redondeo_lista_a
        )
      END * (1 + t.margen_online),
      t.redondeo_venta_a
    ) * (1 + t.recargo_12),
    t.redondeo_venta_a
  ) AS precio_12_cuotas,
  
  -- Efectivo sin IVA
  redondear_a(
    (redondear_a(
      CASE 
        WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
        ELSE redondear_a(
          p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
          t.redondeo_lista_a
        )
      END * (1 + t.margen_online),
      t.redondeo_venta_a
    ) / (1 + t.iva)) * (1 - t.desc_cash_caba),
    t.redondeo_venta_a
  ) AS efectivo_sin_iva_caba,
  
  redondear_a(
    (redondear_a(
      CASE 
        WHEN p.precio_lista_base IS NOT NULL THEN p.precio_lista_base
        ELSE redondear_a(
          p.costo * (t.jitter_min + (RANDOM() * (t.jitter_max - t.jitter_min))),
          t.redondeo_lista_a
        )
      END * (1 + t.margen_online),
      t.redondeo_venta_a
    ) / (1 + t.iva)) * (1 - t.desc_cash_interior),
    t.redondeo_venta_a
  ) AS efectivo_sin_iva_interior,
  
  -- Mayorista
  redondear_a(
    p.costo * (1 + t.margen_mayorista_cf),
    t.redondeo_venta_a
  ) AS mayorista_con_factura,
  
  redondear_a(
    p.costo * (1 + t.margen_mayorista_sf),
    t.redondeo_venta_a
  ) AS mayorista_sin_factura

FROM productos p
CROSS JOIN tarifas t
WHERE t.vigente = true AND p.activo = true;
