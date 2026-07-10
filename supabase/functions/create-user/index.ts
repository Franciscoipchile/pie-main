import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Manejo de peticiones CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables (URL, SERVICE_ROLE_KEY, or ANON_KEY)");
    }

    // 1. Inicializar el cliente administrador (bypassea RLS para operaciones privilegiadas)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 2. Validar que la petición venga de un usuario autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verificar que el usuario que realiza la petición sea un Administrador en la base de datos
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.rol !== "administrador") {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only administrators can create users." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Leer parámetros del cuerpo de la petición
    const { email, password, nombre, apellido, rol, rut } = await req.json();

    if (!email || !password || !nombre || !apellido || !rol) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, nombre, apellido, rol" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Crear el usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true,
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUser = authData.user;

    // 6. Registrar los detalles del perfil en la tabla public.usuarios
    const { error: dbError } = await supabaseAdmin.from("usuarios").insert({
      id: newUser.id,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rol: rol, // Mapeado correctamente en el cliente
      rut: rut ? rut.trim() : null,
      email: email.trim().toLowerCase(),
      activo: true,
    });

    if (dbError) {
      // Rollback manual: Si falla el registro en la base de datos, eliminamos el usuario de Auth para evitar inconsistencias
      await supabaseAdmin.auth.admin.deleteUser(newUser.id);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${dbError.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ user: newUser }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
