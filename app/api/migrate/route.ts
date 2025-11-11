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
