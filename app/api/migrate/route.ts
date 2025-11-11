import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    console.log('🔄 Ejecutando migración 009: hacer lead_consultas nullable')
    
    // Hacer medida_neumatico nullable
    await sql`
      ALTER TABLE lead_consultas 
      ALTER COLUMN medida_neumatico DROP NOT NULL
    `
    
    console.log('✅ Paso 1: medida_neumatico ahora es nullable')
    
    // Agregar updated_at si no existe
    try {
      await sql`
        ALTER TABLE lead_consultas 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
      `
      console.log('✅ Paso 2: agregada columna updated_at')
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('⚠️ Columna updated_at ya existe, skipping')
      } else {
        throw e
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migración ejecutada exitosamente' 
    })
  } catch (error: any) {
    console.error('❌ Error en migración:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}
