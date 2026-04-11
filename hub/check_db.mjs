import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const accs = await pool.query("SELECT id, label, base_url FROM provider_accounts WHERE label ILIKE '%anthropic%' OR label ILIKE '%claude%' OR base_url ILIKE '%anthropic%'");
    console.log('Provider Accounts:', accs.rows);
    
    for (const acc of accs.rows) {
      const keys = await pool.query("SELECT id, label, api_key FROM provider_api_keys WHERE provider_account_id = $1", [acc.id]);
      console.log(`Keys for ${acc.label}:`, keys.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
