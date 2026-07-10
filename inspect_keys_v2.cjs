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
  try {
    // 1. Get valid IDs
    const { data: curso } = await supabase.from('cursos').select('id').limit(1).single();
    const { data: asignatura } = await supabase.from('asignaturas').select('id').limit(1).single();

    if (!curso || !asignatura) {
      console.log("Missing master data to create a test row.");
      return;
    }

    // 2. Insert temporary bloque
    const testBloqueId = '00000000-0000-0000-0000-777777777777';
    console.log("Inserting temporary bloque...");
    await supabase.from('bloques_horarios').insert({
      id: testBloqueId,
      nombre: 'TEST_BLOQUE',
      orden: 99
    });

    // 3. Insert test row in 'horarios'
    const testHorarioId = '00000000-0000-0000-0000-999999999999';
    console.log("Inserting test row in 'horarios'...");
    const { data: inserted, error: insertError } = await supabase
      .from('horarios')
      .insert({
        id: testHorarioId,
        curso_id: curso.id,
        bloque_id: testBloqueId,
        asignatura_id: asignatura.id,
        dia_semana: 1,
        resumen_clase: 'TEST_SUMMARY'
      })
      .select('*')
      .single();

    if (insertError) {
      console.error("Insert Error:", insertError);
    } else {
      console.log("✅ Successfully inserted a row in 'horarios'!");
      console.log("All columns in 'horarios':", Object.keys(inserted));
      console.log("Row details:", inserted);
    }

    // Clean up
    console.log("Cleaning up test rows...");
    await supabase.from('horarios').delete().eq('id', testHorarioId);
    await supabase.from('bloques_horarios').delete().eq('id', testBloqueId);

  } catch (e) {
    console.error("Script error:", e);
  }
}

run();
