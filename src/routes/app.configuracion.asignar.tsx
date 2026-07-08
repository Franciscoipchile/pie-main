import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/configuracion/asignar")({
  component: AsignarHorarios,
});

function AsignarHorarios() {
  const [bloques, setBloques] = useState<any[]>([]);
  // Aquí faltaría cargar cursos, asignaturas y profes de tus tablas existentes
  
  useEffect(() => {
    supabase.from("bloques_horarios").select("*").then(({ data }) => setBloques(data || []));
  }, []);

  const guardarHorario = async (data: any) => {
    await supabase.from("horarios").insert(data);
    alert("Horario asignado correctamente");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Asignar Clases a Horario</h2>
      
      <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aquí irían los Selects para Curso, Asignatura, Profesor y Bloque */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Bloque</label>
          <Select onValueChange={(val) => console.log(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un bloque" />
            </SelectTrigger>
            <SelectContent>
              {bloques.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.nombre} ({b.hora_inicio} - {b.hora_fin})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button className="mt-6" onClick={() => guardarHorario({})}>
          Registrar Asignación
        </Button>
      </Card>
    </div>
  );
}