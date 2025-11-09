#!/usr/bin/env node
// scripts/run-single-sql.js
// Ejecuta un único archivo SQL pasado como argumento (o por defecto create-productos-safe.sql)

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const arg = process.argv[2] || 'create-productos-safe.sql'
const p = path.join(__dirname, arg)

if (!fs.existsSync(p)) {
  console.error('File not found:', p)
  process.exit(1)
}

// Load .env.local if present
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

const conn = process.env.NEON_NEON_DATABASE_URL
if (!conn) {
  console.error('ERROR: NEON_NEON_DATABASE_URL no está definida. Rellena .env.local o exporta la variable en la sesión.')
  process.exit(1)
}

async function run() {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    console.log('Conectado a la DB.')
    const sql = fs.readFileSync(p, 'utf8')
    await client.query(sql)
    console.log('OK:', arg)
  } catch (err) {
    console.error('Error ejecutando', arg, ':', err.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
