import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log('🔄 Ejecutando migraciones de base de datos')
    
    // Migración 009: Hacer medida_neumatico nullable
    try {
      await sql`
        ALTER TABLE lead_consultas 
        ALTER COLUMN medida_neumatico DROP NOT NULL
      `
      console.log('✅ Migración 009: medida_neumatico ahora es nullable')
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log('⚠️ Columna ya es nullable, skipping')
      } else {
        console.error('Error en migración 009:', e.message)
      }
    }
    
    // Agregar updated_at si no existe
    try {
      await sql`
        ALTER TABLE lead_consultas 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
      `
      console.log('✅ Migración 009: agregada columna updated_at')
    } catch (e: any) {
      console.log('⚠️ Columna updated_at ya existe, skipping')
    }

    // Migración 010: Agregar campos de producto a lead_pedidos
    try {
      await sql`
        ALTER TABLE lead_pedidos 
        ADD COLUMN IF NOT EXISTS producto_elegido_marca TEXT,
        ADD COLUMN IF NOT EXISTS producto_elegido_modelo TEXT,
        ADD COLUMN IF NOT EXISTS producto_elegido_medida TEXT,
        ADD COLUMN IF NOT EXISTS producto_elegido_diseno TEXT,
        ADD COLUMN IF NOT EXISTS precio_unitario DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS precio_final DECIMAL(10,2)
      `
      console.log('✅ Migración 010: agregados campos de producto a lead_pedidos')
    } catch (e: any) {
      console.log('⚠️ Error en migración 010:', e.message)
    }

    // Migración 011: Refactorizar estados y campos de producto
    console.log('🔄 Iniciando Migración 011...')
    
    // PASO 0: Primero corregir los estados legacy ANTES de agregar el constraint
    try {
      console.log('📝 Migración 011.0: Corrigiendo estados legacy...')
      await sql`UPDATE leads SET estado = 'nuevo' WHERE estado IN ('contacto_inicial', 'nuevo_contacto')`
      await sql`UPDATE leads SET estado = 'en_conversacion' WHERE estado IN ('conversacion_iniciada', 'en_consulta')`
      await sql`UPDATE leads SET estado = 'cotizado' WHERE estado IN ('consulta_producto', 'cotizacion_enviada')`
      await sql`UPDATE leads SET estado = 'esperando_pago' WHERE estado IN ('en_proceso_de_pago', 'esperando_confirmacion')`
      await sql`UPDATE leads SET estado = 'pago_informado' WHERE estado IN ('pago_pendiente_confirmacion')`
      await sql`UPDATE leads SET estado = 'pedido_confirmado' WHERE estado IN ('pedido_finalizado', 'venta_confirmada', 'confirmado')`
      await sql`UPDATE leads SET estado = 'perdido' WHERE estado IN ('abandonado', 'no_interesado', 'perdido_contacto')`
      await sql`
        UPDATE leads SET estado = 'nuevo' 
        WHERE estado NOT IN ('nuevo', 'en_conversacion', 'cotizado', 'esperando_pago', 'pago_informado', 'pedido_confirmado', 'perdido')
      `
      console.log('✅ Migración 011.0: Estados legacy corregidos')
    } catch (e: any) {
      console.log('⚠️ Error corrigiendo estados legacy:', e.message)
    }
    
    // 1. Actualizar constraint de estados
    try {
      await sql`ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_estado_check`
      await sql`
        ALTER TABLE leads ADD CONSTRAINT leads_estado_check 
        CHECK (estado IN ('nuevo', 'en_conversacion', 'cotizado', 'esperando_pago', 'pago_informado', 'pedido_confirmado', 'perdido'))
      `
      console.log('✅ Migración 011.1: actualizados estados de leads')
    } catch (e: any) {
      console.log('⚠️ Error actualizando constraint de estados:', e.message)
    }
      
    // 2. Agregar nuevos campos a lead_pedidos
    try {
      await sql`
        ALTER TABLE lead_pedidos 
        ADD COLUMN IF NOT EXISTS producto_descripcion TEXT,
        ADD COLUMN IF NOT EXISTS forma_pago_detalle TEXT
      `
      console.log('✅ Migración 011.2: agregados producto_descripcion y forma_pago_detalle')
    } catch (e: any) {
      console.log('⚠️ Error agregando columnas:', e.message)
    }
      
    // 3. Migrar datos existentes
    try {
      await sql`
        UPDATE lead_pedidos 
        SET producto_descripcion = 
          CASE 
            WHEN producto_elegido_marca IS NOT NULL THEN
              CONCAT_WS(' ', 
                producto_elegido_marca,
                producto_elegido_modelo,
                producto_elegido_medida,
                producto_elegido_diseno
              )
            ELSE NULL
          END
        WHERE producto_elegido_marca IS NOT NULL AND producto_descripcion IS NULL
      `
      console.log('✅ Migración 011.3: migrados datos de producto')
    } catch (e: any) {
      console.log('⚠️ Error migrando datos:', e.message)
    }
      
    // 4. Agregar estado_turno a turnos
    try {
      await sql`
        ALTER TABLE turnos 
        ADD COLUMN IF NOT EXISTS estado_turno VARCHAR(50) DEFAULT 'pendiente'
      `
      await sql`ALTER TABLE turnos DROP CONSTRAINT IF EXISTS turnos_estado_turno_check`
      await sql`
        ALTER TABLE turnos ADD CONSTRAINT turnos_estado_turno_check 
        CHECK (estado_turno IN ('pendiente', 'confirmado', 'completado', 'cancelado'))
      `
      console.log('✅ Migración 011.4: agregado estado_turno a turnos')
    } catch (e: any) {
      console.log('⚠️ Error agregando estado_turno:', e.message)
    }
      
    // 5. Migrar estados existentes de turnos
    try {
      await sql`
        UPDATE turnos 
        SET estado_turno = 
          CASE 
            WHEN estado = 'confirmado' THEN 'confirmado'
            WHEN estado = 'completado' THEN 'completado'
            WHEN estado = 'cancelado' THEN 'cancelado'
            ELSE 'pendiente'
          END
        WHERE estado_turno = 'pendiente'
      `
      console.log('✅ Migración 011.5: migrados estados de turnos')
    } catch (e: any) {
      console.log('⚠️ Error migrando estados de turnos:', e.message)
    }
      
    // 6. Crear índices
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado)`
      await sql`CREATE INDEX IF NOT EXISTS idx_turnos_estado_turno ON turnos(estado_turno)`
      await sql`CREATE INDEX IF NOT EXISTS idx_lead_pedidos_lead_id ON lead_pedidos(lead_id)`
      console.log('✅ Migración 011.6: creados índices')
    } catch (e: any) {
      console.log('⚠️ Error creando índices:', e.message)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migraciones ejecutadas exitosamente' 
    })
  } catch (error: any) {
    console.error('❌ Error en migración:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
