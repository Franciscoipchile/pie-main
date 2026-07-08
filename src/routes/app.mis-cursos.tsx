import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/app/mis-cursos")({
  component: MisCursosDocenteView,
});

function MisCursosDocenteView() {
  const [cargaAcademica, setCargaAcademica] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarCargaHorariaReal = async () => {
      try {
        // 1. Obtener el usuario autenticado actualmente
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 2. Corregido: Consultamos la nueva tabla 'cargas_academicas'
        const { data, error } = await supabase
          .from("cargas_academicas")
          .select(`
            id,
            cursos (id, numero, letra, nivel),
            asignaturas (id, nombre)
          `)
          .eq("profesor_id", user.id);

        if (error) throw error;
        if (data) setCargaAcademica(data);
      } catch (err) {
        console.error("Error al cargar la carga académica:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarCargaHorariaReal();
  }, []);

  return (
    <div className="space-y-6 text-sm">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Mis cursos y alumnos</h2>
        <p className="text-sm text-muted-foreground">
          Cursos y asignaturas asignados formalmente por el Administrador en la base de datos.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">
          Consultando distribución horaria en Supabase...
        </div>
      ) : cargaAcademica.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground bg-muted/20 border-dashed border">
          No registras asignaturas ni cursos asignados en el sistema. Contacta al Administrador.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cargaAcademica.map((item) => {
            const curso = item.cursos;
            const asignatura = item.asignaturas;
            if (!curso || !asignatura) return null;

            return (
              <Card key={item.id} className="p-5 hover:shadow-md transition-shadow border flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50/50 uppercase tracking-wider text-[10px]">
                      {curso.nivel}
                    </Badge>
                    <BookOpen className="size-4 text-muted-foreground" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-800">
                    {curso.numero}° {curso.letra}
                  </h3>
                  
                  <p className="text-sm font-medium text-slate-600 flex items-center gap-1.5 uppercase tracking-wide text-xs">
                    <GraduationCap className="size-3.5 text-primary" /> {asignatura.nombre}
                  </p>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" /> Libro de Clases Activo
                  </span>
                  <Badge variant="secondary" className="text-[10px]">Vigente</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}