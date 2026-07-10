const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('./.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    env[key] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("Querying information_schema.columns...");
  const { data, error } = await supabase.from('information_schema.columns').select('table_name, column_name').eq('table_schema', 'public');
  console.log("Error:", error);
  if (data) {
    console.log("Columns count:", data.length);
    console.log("Columns:", data);
  }
}

run();
