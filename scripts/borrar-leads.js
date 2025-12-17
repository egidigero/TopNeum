const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.NEON_NEON_DATABASE_URL);

async function borrarLeads() {
  try {
    console.log('🗑️ Borrando leads...');
    await sql`DELETE FROM leads`;
    console.log('✅ Leads borrados exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

borrarLeads();
