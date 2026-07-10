const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read env variables directly from the .env file
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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  try {
    console.log("Fetching a row from 'horarios' table...");
    const { data: horarios, error: errH } = await supabase.from('horarios').select('*').limit(1);
    if (errH) {
      console.error("Error fetching from horarios:", errH);
    } else {
      console.log("Columns in 'horarios':", horarios && horarios.length > 0 ? Object.keys(horarios[0]) : "No data (empty table)");
      console.log("Sample row:", horarios && horarios[0]);
    }

    console.log("\nFetching a row from 'asistencia' table...");
    const { data: asistencia, error: errA } = await supabase.from('asistencia').select('*').limit(1);
    if (errA) {
      console.error("Error fetching from asistencia:", errA);
    } else {
      console.log("Columns in 'asistencia':", asistencia && asistencia.length > 0 ? Object.keys(asistencia[0]) : "No data (empty table)");
      console.log("Sample row:", asistencia && asistencia[0]);
    }

    console.log("\nAttempting to query other tables to see if a 'diario' or 'resumen' table exists...");
    const tables = ['asistencia_resumen', 'resumen_clase', 'resumen_clases', 'diarios_clase', 'registro_clases', 'clases'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (!error || error.code !== 'PGRST116' && error.message.indexOf("does not exist") === -1) {
        console.log(`Table '${table}' exists! (Error code: ${error ? error.code : 'none'}, Msg: ${error ? error.message : 'none'})`);
      }
    }

  } catch (e) {
    console.error("Error during inspection:", e);
  }
}

inspect();
