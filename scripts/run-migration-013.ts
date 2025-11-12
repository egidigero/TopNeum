import { neon } from '@neondatabase/serverless'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sql = neon(process.env.DATABASE_URL!)

async function runMigration() {
  console.log('🔄 Ejecutando migración 013: Agregar datos_adicionales...')
  
  const migrationPath = path.join(__dirname, '013-add-datos-adicionales-column.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
  
  try {
    // Dividir por punto y coma y ejecutar cada statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📝 Ejecutando ${statements.length} statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        console.log(`   ${i + 1}/${statements.length} - Ejecutando...`)
        await sql(statement)
      }
    }
    
    console.log('✅ Migración ejecutada exitosamente!')
    console.log('')
    console.log('📊 Verificando resultados...')
    
    const result = await sql`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(datos_adicionales) FILTER (WHERE datos_adicionales != '{}'::jsonb) as con_datos
      FROM leads
    `
    
    console.log(`   Total leads: ${result[0].total_leads}`)
    console.log(`   Con datos adicionales: ${result[0].con_datos}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

runMigration()
