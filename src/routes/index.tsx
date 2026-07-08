import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Lock, Mail, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase"; 
import { useAuth } from "@/store"; // Sincroniza con el estado global de tu aplicación

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Si ya existe una sesión real en Supabase, el sistema lo ingresa automáticamente
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/app" });
    }
  },
  component: LoginPage,
  head: () => ({
    meta: [
      // Actualizado con el rebranding oficial de la pestaña
      { title: "Ingreso · Aula Digital" },
      { name: "description", content: "Acceso seguro a la plataforma de asistencia y gestión escolar integrada." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) return;

    setLoading(true);

    try {
      // 1. Autenticación real en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (authError) {
        alert("Error de ingreso: El correo electrónico o la contraseña son incorrectos.");
        setLoading(false);
        return;
      }

      // 2. Buscar el rol verídico en tu tabla publica.usuarios usando el ID autenticado
      const { data: perfil, error: perfilError } = await supabase
        .from("usuarios")
        .select("nombre, apellido, rol, activo")
        .eq("id", authData.user?.id)
        .single();

      if (perfilError || !perfil) {
        alert("Error de cuenta: No se encontró un perfil institucional para este usuario.");
        await supabase.auth.signOut();
        return;
      }

      // 3. Validar si el usuario está activo en el establecimiento
      if (!perfil.activo) {
        alert("Acceso denegado: Tu cuenta se encuentra desactivada. Contacta al administrador.");
        await supabase.auth.signOut();
        return;
      }

      // 4. Mapear el rol de la Base de Datos al formato que entiende tu @/store de Lovable
      const storeRole = perfil.rol === "profesora_pie" ? "encargada" : perfil.rol === "administrador" ? "admin" : "profesor";
      
      // Guardamos el nombre y el rol real en el estado de la aplicación
      const loginStore = useAuth.getState().login;
      const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`;
      loginStore(nombreCompleto, storeRole);

      // 5. Redirección exitosa
      alert(`¡Ingreso exitoso! Bienvenido/a ${nombreCompleto}.`);
      navigate({ to: "/app" });

    } catch (err) {
      console.error(err);
      alert("Error de conexión: Hubo un problema al conectar con el servidor de Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-soft via-background to-background">
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-xl bg-card border border-border min-h-[460px]">
        
        {/* Panel Estético Izquierdo - Rebranding Aula Digital */}
        <div className="hidden md:flex flex-col justify-between bg-emerald-700 text-white p-10 relative overflow-hidden select-none">
          <div className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-24 -left-16 size-80 rounded-full bg-white/5" />
          
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-2xl bg-white text-emerald-700 grid place-items-center font-black text-sm shadow-sm">
                AD
              </div>
              <div>
                <div className="font-bold text-base leading-tight">Aula Digital</div>
                <div className="text-[10px] uppercase tracking-wider text-emerald-100/80 font-medium">Gestión Escolar Integrada</div>
              </div>
            </div>
          </div>

          <div className="relative space-y-4">
            <h2 className="text-3xl font-black leading-tight tracking-tight">
              Control digital integrado para tu establecimiento.
            </h2>
            <p className="text-emerald-100/90 text-xs leading-relaxed font-normal">
              Gestiona libros de asistencia, actas de calificaciones, mallas horarias, anotaciones e intervenciones del programa PIE desde un único ecosistema web unificado.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-100/80 font-semibold uppercase tracking-wider pt-2 border-t border-white/20">
              <BookOpen className="size-4" />
              Ecosistema Institucional · 2026
            </div>
          </div>
        </div>

        {/* Formulario Derecho - Mantiene tus inputs e idéntica lógica */}
        <div className="p-8 md:p-10 flex flex-col justify-center bg-white">
          <div className="md:hidden flex items-center gap-2 mb-6 select-none">
            <div className="size-10 rounded-xl bg-emerald-700 text-white grid place-items-center font-black text-xs">
              AD
            </div>
            <div className="font-bold text-slate-800 text-sm">Aula Digital</div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 mb-1">Iniciar sesión</h1>
          <p className="text-xs text-muted-foreground mb-6 font-normal">
            Ingresa con tus credenciales institucionales para continuar.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-600 uppercase">Correo Institucional</Label>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9 h-10 text-xs font-semibold"
                  placeholder="usuario@colegio.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pass" className="text-xs font-bold text-slate-600 uppercase">Contraseña</Label>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pass"
                  type="password"
                  className="pl-9 h-10 text-xs font-semibold"
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm mt-2" 
              size="lg" 
              disabled={loading}
            >
              {loading ? "Verificando credenciales..." : "Ingresar al Sistema"}
            </Button>
          </form>
        </div>

      </div>
    </div>
  );
}