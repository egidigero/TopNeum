import { sql } from './lib/db.js'

console.log('🗑️  Borrando TODOS los leads y datos relacionados...\n')

try {
  // Borrar en orden de dependencias (más dependientes primero)
  console.log('📋 Borrando lead_historial...')
  await sql`DELETE FROM lead_historial`
  
  console.log('🎫 Borrando lead_tickets...')
  await sql`DELETE FROM lead_tickets`
  
  console.log('📅 Borrando turnos...')
  await sql`DELETE FROM turnos`
  
  console.log('🚚 Borrando lead_entregas...')
  await sql`DELETE FROM lead_entregas`
  
  console.log('📦 Borrando lead_pedidos...')
  await sql`DELETE FROM lead_pedidos`
  
  console.log('💰 Borrando lead_cotizaciones...')
  await sql`DELETE FROM lead_cotizaciones`
  
  console.log('🔍 Borrando lead_consultas...')
  await sql`DELETE FROM lead_consultas`
  
  console.log('👥 Borrando leads...')
  await sql`DELETE FROM leads`
  
  console.log('\n✅ Todos los leads fueron borrados exitosamente!\n')
  
  // Verificar que todo se borró
  console.log('📊 Verificando...\n')
  
  const counts = await sql`
    SELECT 'leads' as tabla, COUNT(*) as registros FROM leads
    UNION ALL
    SELECT 'lead_consultas', COUNT(*) FROM lead_consultas
    UNION ALL
    SELECT 'lead_cotizaciones', COUNT(*) FROM lead_cotizaciones
    UNION ALL
    SELECT 'lead_pedidos', COUNT(*) FROM lead_pedidos
    UNION ALL
    SELECT 'lead_entregas', COUNT(*) FROM lead_entregas
    UNION ALL
    SELECT 'turnos', COUNT(*) FROM turnos
    UNION ALL
    SELECT 'lead_tickets', COUNT(*) FROM lead_tickets
    UNION ALL
    SELECT 'lead_historial', COUNT(*) FROM lead_historial
  `
  
  console.table(counts)
  
  process.exit(0)
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}
