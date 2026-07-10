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

async function inspectSchema() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const text = await res.text();
    console.log("Raw Response:", text.substring(0, 1000));
    const schema = JSON.parse(text);
    console.log("Paths available:", schema.paths ? Object.keys(schema.paths) : "No paths key");
    console.log("Definitions key available:", schema.definitions ? "yes" : "no");
  } catch (e) {
    console.error("Error inspecting schema:", e);
  }
}

inspectSchema();
