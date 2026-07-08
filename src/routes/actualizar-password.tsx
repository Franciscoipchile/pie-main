import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/actualizar-password")({
  component: ActualizarPasswordView,
});

function ActualizarPasswordView() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setGuardando(true);
    try {
      // Supabase reconoce automáticamente al usuario gracias al token del correo
      const { error } = await supabase.auth.updateUser({ password: password.trim() });
      
      if (error) throw error;

      toast.success("✓ Contraseña actualizada con éxito. Ya puedes ingresar.");
      
      // Lo mandamos al login fresco
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);

    } catch (err: any) {
      toast.error("✗ Error al actualizar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-sm">
      <Card className="w-full max-w-md p-6 space-y-4 shadow-lg bg-white border">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Establecer Nueva Contraseña</h1>
          <p className="text-xs text-muted-foreground">Ingresa tu nueva clave institucional para recuperar el acceso a Aula Digital.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-pass" className="text-xs font-bold text-slate-600 uppercase">Nueva Contraseña</Label>
            <div className="relative">
              <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-pass"
                type="password"
                className="pl-9 h-10 text-xs font-semibold"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={guardando}
                required
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider"
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Actualizar Contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  );
}