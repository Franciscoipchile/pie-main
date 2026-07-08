import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/configuracion")({
  component: PanelConfiguracionMaestra,
});

function PanelConfiguracionMaestra() {
  const [cursos, setCursos] = useState<any[]>([]);
  const [asignaturas, setAsignaturas] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Estados de selección del Administrador
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [mallaHoraria, setMallaHoraria] = useState<any[]>([]);

  // Formulario para añadir materia al horario del curso
  const [nuevaClase, setNuevaClase] = useState({ bloque_id: "", asignatura_id: "", dia_semana: "1" });
  
  // Formulario para asignarle la materia a un Profesor
  const [nuevaCarga, setNuevaCarga] = useState({ profesor_id: "", asignatura_id: "" });
  const [cargasProfesor, setCargasProfesor] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (cursoSeleccionado) {
      cargarMallaYProfesoresDelCurso(cursoSeleccionado);
    }
  }, [cursoSeleccionado]);

  async function cargarDatosIniciales() {
    const [c, a, b, u] = await Promise.all([
      supabase.from("cursos").select("*").order("nivel, numero"),
      supabase.from("asignaturas").select("*").order("nombre"),
      supabase.from("bloques_horarios").select("*").order("orden"),
      supabase.from("usuarios").select("id, nombre, rol").eq("rol", "profesor")
    ]);
    setCursos(c.data || []);
    setAsignaturas(a.data || []);
    setBloques(b.data || []);
    setUsuarios(u.data || []);
  }

  async function cargarMallaYProfesoresDelCurso(cursoId: string) {
    const { data: malla } = await supabase
      .from("horarios_curso")
      .select("*, bloques_horarios(nombre, hora_inicio), asignaturas(nombre)")
      .eq("curso_id", cursoId);
    
    const { data: cargas } = await supabase
      .from("cargas_academicas")
      .select("*, usuarios(nombre), asignaturas(nombre)")
      .eq("curso_id", cursoId);

    setMallaHoraria(malla || []);
    setCargasProfesor(cargas || []);
  }

  async function agregarMateriaAHorario() {
    if (!cursoSeleccionado || !nuevaClase.bloque_id || !nuevaClase.asignatura_id) {
      toast.error("Completa el bloque y la asignatura para el curso");
      return;
    }
    const { error } = await supabase.from("horarios_curso").insert({
      curso_id: cursoSeleccionado,
      ...nuevaClase
    });

    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Bloque añadido a la grilla del curso");
      cargarMallaYProfesoresDelCurso(cursoSeleccionado);
    }
  }

  async function eliminarMateriaDeHorario(id: string) {
    const { error } = await supabase.from("horarios_curso").delete().eq("id", id);
    if (error) toast.error("Error al quitar el bloque: " + error.message);
    else {
      toast.success("Bloque removido del horario");
      cargarMallaYProfesoresDelCurso(cursoSeleccionado);
    }
  }

  async function asignarProfesorAMateria() {
    if (!cursoSeleccionado || !nuevaCarga.profesor_id || !nuevaCarga.asignatura_id) {
      toast.error("Selecciona un profesor y la asignatura que dictará");
      return;
    }
    const { error } = await supabase.from("cargas_academicas").insert({
      curso_id: cursoSeleccionado,
      ...nuevaCarga
    });

    if (error) toast.error("Error: " + error.message);
    else {
      toast.success("Profesor asignado a la asignatura con éxito");
      cargarMallaYProfesoresDelCurso(cursoSeleccionado);
    }
  }

  async function eliminarCargaProfesor(id: string) {
    const { error } = await supabase.from("cargas_academicas").delete().eq("id", id);
    if (error) toast.error("Error al desasignar profesor: " + error.message);
    else {
      toast.success("Profesor removido de la asignatura");
      cargarMallaYProfesoresDelCurso(cursoSeleccionado);
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Planificador Escolar Maestro</h2>
        <p className="text-slate-500 mt-1">Configura las mallas horarias de los cursos y delega los profesores correspondientes.</p>
      </div>

      {/* Selector Principal de Curso */}
      <Card className="p-6 bg-slate-900 text-white">
        <label className="block text-sm font-medium mb-2 text-slate-300">Selecciona el Curso a Configurar:</label>
        <select 
          className="w-full md:w-1/3 bg-slate-800 border border-slate-700 p-2.5 rounded-lg text-white font-medium"
          value={cursoSeleccionado}
          onChange={(e) => setCursoSeleccionado(e.target.value)}
        >
          <option value="">-- Elige un Curso Escolar --</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nivel} {c.numero}° {c.letra}</option>)}
        </select>
      </Card>

      {cursoSeleccionado && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECCIÓN A: ARMAR LA MALLA DEL CURSO */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4 border-t-4 border-blue-600">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Clock className="text-blue-600"/> 1. Definir Horario del Curso</h3>
              <p className="text-sm text-slate-500">Establece qué asignaturas se enseñan en cada bloque para este grupo.</p>
              
              <div className="grid grid-cols-3 gap-2">
                <select className="border p-2 rounded text-sm" onChange={e => setNuevaClase({...nuevaClase, dia_semana: e.target.value})}>
                  {['Lunes','Martes','Miércoles','Jueves','Viernes'].map((d, i) => <option key={d} value={i+1}>{d}</option>)}
                </select>
                <select className="border p-2 rounded text-sm" onChange={e => setNuevaClase({...nuevaClase, bloque_id: e.target.value})}>
                  <option value="">Bloque</option>
                  {bloques.map(b => <option key={b.id} value={b.id}>{b.nombre} ({b.hora_inicio})</option>)}
                </select>
                <select className="border p-2 rounded text-sm" onChange={e => setNuevaClase({...nuevaClase, asignatura_id: e.target.value})}>
                  <option value="">Asignatura</option>
                  {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <Button onClick={agregarMateriaAHorario} className="w-full bg-blue-600 hover:bg-blue-700 text-white"><Plus className="size-4 mr-2"/> Vincular a la Malla</Button>
            </Card>

            {/* Lista de la Malla actual del curso */}
            <Card className="p-6">
              <h4 className="font-semibold text-slate-700 mb-4">Grilla Horaria del Curso</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {mallaHoraria.length === 0 && <p className="text-sm text-slate-400 italic">No hay materias asignadas a este horario todavía.</p>}
                {mallaHoraria.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-700 mr-2">
                        {['','Lunes','Martes','Miércoles','Jueves','Viernes'][parseInt(m.dia_semana)]}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{m.asignaturas?.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{m.bloques_horarios?.nombre} ({m.bloques_horarios?.hora_inicio})</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 p-1 h-auto"
                        onClick={() => eliminarMateriaDeHorario(m.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* SECCIÓN B: ASIGNAR PROFESORES A LAS MATERIAS */}
          <div className="space-y-6">
            <Card className="p-6 space-y-4 border-t-4 border-emerald-600">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Plus className="text-emerald-600"/> 2. Designar Profesores al Curso</h3>
              <p className="text-sm text-slate-500">Asigna qué profesor se hará cargo de cada asignatura en este curso.</p>

              <div className="grid grid-cols-2 gap-2">
                <select className="border p-2 rounded text-sm" onChange={e => setNuevaCarga({...nuevaCarga, profesor_id: e.target.value})}>
                  <option value="">Seleccione Profesor</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
                <select className="border p-2 rounded text-sm" onChange={e => setNuevaCarga({...nuevaCarga, asignatura_id: e.target.value})}>
                  <option value="">Asignatura a dictar</option>
                  {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <Button onClick={asignarProfesorAMateria} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Dar Carga Académica</Button>
            </Card>

            {/* Profesores del curso actual */}
            <Card className="p-6">
              <h4 className="font-semibold text-slate-700 mb-4">Docentes a cargo del Curso</h4>
              <div className="space-y-2">
                {cargasProfesor.length === 0 && <p className="text-sm text-slate-400 italic">No hay profesores asignados a asignaturas en este curso.</p>}
                {cargasProfesor.map(c => (
                  <div key={c.id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex justify-between items-center hover:bg-emerald-100/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-emerald-900">{c.usuarios?.nombre}</p>
                      <p className="text-xs text-emerald-700">Asignatura: {c.asignaturas?.nombre}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50 hover:text-red-700 p-1 h-auto"
                      onClick={() => eliminarCargaProfesor(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}