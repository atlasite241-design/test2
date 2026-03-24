import pkg from 'pg';
const { Pool } = pkg;

async function testConn() {
  const connectionString = `postgresql://postgres.yruxuuyxrogmkmmbhcco:ontfinder2009210@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?options=-c%20pool_mode=transaction`;
  console.log(`Testing new password without @@...`);
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`Success:`, res.rows[0]);
    return true;
  } catch (e) {
    console.log(`Failed:`, e.message);
    return false;
  } finally {
    await pool.end();
  }
}

testConn();
