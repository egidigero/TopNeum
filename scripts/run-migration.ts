import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Ejecutando migración 009...')
  
  const migrationSQL = fs.readFileSync('./scripts/009-make-lead-consultas-nullable.sql', 'utf-8')
  
  try {
    await sql(migrationSQL)
    console.log('✅ Migración ejecutada exitosamente!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()
