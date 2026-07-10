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
  const tables = ['usuarios', 'cursos', 'bloques_horarios', 'asignaturas', 'cargas_academicas', 'horarios', 'asistencia', 'alumnos'];
  console.log("ROW COUNTS FOR TABLES:");
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table '${table}': Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table '${table}': ${count} rows`);
    }
  }
}

run();
