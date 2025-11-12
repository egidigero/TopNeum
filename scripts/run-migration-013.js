#!/usr/bin/env node
// scripts/run-migration-013.js
// Ejecuta la migración 013 para agregar datos_adicionales

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Cargar .env.local
const connEnvKey = 'NEON_NEON_DATABASE_URL'
if (!process.env[connEnvKey] && !process.env.DATABASE_URL) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local')
    if (fs.existsSync(envPath)) {
      const envRaw = fs.readFileSync(envPath, 'utf8')
      envRaw.split(/\r?\n/).forEach((line) => {
        line = line.trim()
        if (!line || line.startsWith('#')) return
        const eq = line.indexOf('=')
        if (eq === -1) return
        const key = line.slice(0, eq).trim()
        let val = line.slice(eq + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        if (!process.env[key]) process.env[key] = val
      })
    }
  } catch (e) {
    // ignore
  }
}

const conn = process.env[connEnvKey] || process.env.DATABASE_URL
if (!conn) {
  console.error(`❌ ERROR: ${connEnvKey} o DATABASE_URL no está definida.`)
  process.exit(1)
}

async function run() {
  const client = new Client({
    connectionString: conn,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    await client.connect()
    console.log('✅ Conectado a la base de datos')

    const migrationPath = path.join(__dirname, '013-add-datos-adicionales-column.sql')
    console.log('🔄 Ejecutando migración 013...')
    
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    await client.query(sql)
    console.log('✅ Migración ejecutada exitosamente!')
    
    // Verificar resultado
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(datos_adicionales) FILTER (WHERE datos_adicionales != '{}'::jsonb) as con_datos
      FROM leads
    `)
    
    console.log('')
    console.log('📊 Resultado:')
    console.log(`   Total leads: ${result.rows[0].total_leads}`)
    console.log(`   Con datos adicionales: ${result.rows[0].con_datos}`)

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
