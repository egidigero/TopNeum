import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Ejecutando migración 009...')
  
  const migrationSQL = fs.readFileSync('./scripts/009-make-lead-consultas-nullable.sql', 'utf-8')
  
  try {
    // Separar y ejecutar cada statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      await sql([statement] as any)
    }
    console.log('✅ Migración ejecutada exitosamente!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()
