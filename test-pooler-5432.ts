import pkg from 'pg';
const { Pool } = pkg;

async function testConn(pw) {
  const connectionString = `postgresql://postgres.yruxuuyxrogmkmmbhcco:${pw}@aws-1-eu-west-1.pooler.supabase.com:5432/postgres`;
  console.log(`Testing password: ${pw}`);
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`Success with ${pw}:`, res.rows[0]);
    return true;
  } catch (e) {
    console.log(`Failed with ${pw}:`, e.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  await testConn('ontfinderpro112233');
}

run();
