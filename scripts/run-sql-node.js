#!/usr/bin/env node
// scripts/run-sql-node.js
// Ejecuta una lista de scripts SQL secuencialmente usando `pg` y la env var NEON_NEON_DATABASE_URL

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Try to load .env.local if present (so we don't require exporting env var manually)
if (!process.env.NEON_NEON_DATABASE_URL) {
  try {
    const envPath = require('path').join(__dirname, '..', '.env.local')
    if (require('fs').existsSync(envPath)) {
      const envRaw = require('fs').readFileSync(envPath, 'utf8')
      envRaw.split(/\r?\n/).forEach((line) => {
        line = line.trim()
        if (!line || line.startsWith('#')) return
        const eq = line.indexOf('=')
        if (eq === -1) return
        const key = line.slice(0, eq).trim()
        let val = line.slice(eq + 1).trim()
        // remove optional surrounding quotes
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

const conn = process.env.NEON_NEON_DATABASE_URL
if (!conn) {
  console.error('ERROR: NEON_NEON_DATABASE_URL no está definida. Rellena .env.local o exporta la variable en la sesión.')
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
    console.log('Conectado a la DB (sin exponer la cadena).')

    const files = [
      '001-create-schema.sql',
      '002-create-pricing-view.sql',
      '003-seed-data.sql',
    ]

    for (const f of files) {
      const p = path.join(__dirname, f)
      if (!fs.existsSync(p)) {
        console.warn(`Omitiendo, no existe: ${p}`)
        continue
      }
      console.log(`Ejecutando: ${f} ...`)
      const sql = fs.readFileSync(p, 'utf8')
      try {
        // Ejecutamos el contenido completo. Si hay múltiples statements, pg los ejecuta.
        await client.query(sql)
        console.log(`OK: ${f}`)
      } catch (err) {
        // Ignorar errores de "already exists" (tipos/objetos ya creados) y continuar
        const msg = (err && err.message) ? err.message : ''
        if (err && (err.code === '42710' || /already exists/i.test(msg) || /type ".+" already exists/i.test(msg))) {
          console.warn(`Advertencia (se omitió parte de ${f}): ${msg}`)
        } else {
          throw err
        }
      }
    }

    console.log('\nAll scripts executed successfully.')
  } catch (err) {
    console.error('Error ejecutando scripts SQL:', err.message)
    console.error(err)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
