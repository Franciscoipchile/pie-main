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
    // Get valid IDs
    const { data: curso } = await supabase.from('cursos').select('id').limit(1).maybeSingle();
    const cursoId = curso ? curso.id : '00000000-0000-0000-0000-000000000000';

    console.log("Attempting to insert into 'asistencia' with alumno_id = null...");
    
    const testId = '00000000-0000-0000-0000-888888888888';
    const { data, error } = await supabase
      .from('asistencia')
      .insert({
        id: testId,
        alumno_id: null,
        curso_id: cursoId,
        fecha: '2026-07-10',
        estado: 'presente',
        observacion: 'DAILY_SUMMARY_TEST'
      })
      .select('*');

    if (error) {
      console.log("❌ Failed to insert with null alumno_id. Error:", error.message);
    } else {
      console.log("✅ Success! Null alumno_id is allowed! Data:", data);
      
      // Clean up
      console.log("Cleaning up test row...");
      await supabase.from('asistencia').delete().eq('id', testId);
    }

  } catch (e) {
    console.error("Script error:", e);
  }
}

run();
