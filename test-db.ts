import pool, { query } from "./services/db.js";

async function test() {
  console.log("Testing DB connection...");
  try {
    const res = await query("SELECT NOW()");
    console.log("DB Connection Success:", res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error("DB Connection Failed:", e);
    process.exit(1);
  }
}

test();
