const { neon } = require('@neondatabase/serverless');

const POSTGRES_URL = process.env.NEON_NEON_DATABASE_URL || "postgresql://neondb_owner:npg_xaOgXf23IeLd@ep-wild-king-adns28sc-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(POSTGRES_URL);

async function deleteProducts() {
  try {
    console.log('🗑️  Eliminando todos los productos...');
    
    const result = await sql`DELETE FROM products`;
    
    console.log('✅ Productos eliminados correctamente');
    console.log(`   Total de registros eliminados: ${result.length}`);
    
    // Verificar que no queden productos
    const count = await sql`SELECT COUNT(*) as total FROM products`;
    console.log(`   Productos restantes: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Error al eliminar productos:', error.message);
    process.exit(1);
  }
}

deleteProducts();
