import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'olive_mill',
  user: 'postgres',
  password: 'admin'
});

async function clearSessions() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    const result = await client.query(`DELETE FROM queuer_sessions WHERE status = 'active'`);
    console.log(`✅ Deleted ${result.rowCount} active queuer sessions`);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

clearSessions();
