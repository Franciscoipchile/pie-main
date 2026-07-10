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

async function probe() {
  const columnsToTry = {
    horarios: ['id', 'curso_id', 'bloque_id', 'asignatura_id', 'dia_semana', 'resumen_clase', 'fecha', 'created_at'],
    asistencia: ['id', 'alumno_id', 'curso_id', 'horario_id', 'fecha', 'estado', 'observacion', 'resumen_clase', 'resumen', 'created_at']
  };

  console.log("PROBING COLUMNS:");
  
  for (const [table, columns] of Object.entries(columnsToTry)) {
    console.log(`\nTable: ${table}`);
    for (const col of columns) {
      const { error } = await supabase.from(table).select(col).limit(1);
      if (error && error.message.includes("Could not find the column")) {
        console.log(`❌ Column '${col}': DOES NOT EXIST`);
      } else {
        console.log(`✅ Column '${col}': EXISTS (Error: ${error ? error.message : 'None'})`);
      }
    }
  }
}

probe();
