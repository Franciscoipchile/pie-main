import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Calculator, BookOpen, GraduationCap, Loader2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notas")({
  component: CalificacionesHibridasView,
});

function CalificacionesHibridasView() {
  const [usuarioReal, setUsuarioReal] = useState<any>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  // ----- Estados de Datos Maestros -----
  const [cursosDisponibles, setCursosDisponibles] = useState<any[]>([]);
  const [asignaturasDelCurso, setAsignaturasDelCurso] = useState<any[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  
  // ----- Estados de Selección -----
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState("");
  const [periodo, setPeriodo] = useState("1");

  // ----- Estado de la Matriz de Notas -----
  const [cuadernoNotas, setCuadernoNotas] = useState<Record<string, any>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    async function inicializarModuloNotas() {
      try {
        setInicializando(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("No se detectó una sesión de usuario activa.");
          return;
        }
        setUsuarioReal(user);

        // Consultamos la tabla 'usuarios' trayendo la columna exacta 'rol'
        const { data: perfilBd } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", user.id)
          .maybeSingle();

        // ¡CORREGIDO!: Compara exactamente contra 'administrador'
        const valorEsAdmin = perfilBd?.rol === "administrador";
        setEsAdmin(valorEsAdmin);

        if (valorEsAdmin) {
          const { data: cData } = await supabase.from("cursos").select("*").order("nivel, numero");
          setCursosDisponibles(cData || []);
        } else {
          const { data: cargas = [] } = await supabase
            .from("cargas_academicas")
            .select("curso_id, cursos(id, numero, letra, nivel)")
            .eq("profesor_id", user.id);
          
          const cursosFiltrados = Array.from(new Map(cargas?.map((item: any) => [item.curso_id, item.cursos])).values());
          setCursosDisponibles(cursosFiltrados.filter(Boolean));
        }
      } catch (err) {
        console.error("Error al inicializar notas:", err);
      } finally {
        setInicializando(false);
      }
    }

    inicializarModuloNotas();
  }, []);

  useEffect(() => {
    if (cursoSeleccionado && usuarioReal) {
      cargarAsignaturasDeMalla();
      setAsignaturaSeleccionada("");
      setAlumnos([]);
      setCuadernoNotas({});
    }
  }, [cursoSeleccionado]);

  useEffect(() => {
    if (cursoSeleccionado && asignaturaSeleccionada) {
      cargarAlumnosYNotas();
    }
  }, [asignaturaSeleccionada, periodo]);

  async function cargarAsignaturasDeMalla() {
    try {
      if (esAdmin) {
        const { data } = await supabase
          .from("horarios_curso")
          .select("asignatura_id, asignaturas(id, nombre)")
          .eq("curso_id", cursoSeleccionado);
        
        const unicas = Array.from(new Map(data?.map(item => [item.asignatura_id, item.asignaturas])).values());
        setAsignaturasDelCurso(unicas.filter(Boolean));
      } else {
        const { data: misCargas } = await supabase
          .from("cargas_academicas")
          .select("asignatura_id, asignaturas(id, nombre)")
          .eq("profesor_id", usuarioReal.id)
          .eq("curso_id", cursoSeleccionado);

        const unicasProfe = Array.from(new Map(misCargas?.map(item => [item.asignatura_id, item.asignaturas])).values());
        setAsignaturasDelCurso(unicasProfe.filter(Boolean));
      }
    } catch (err) {
      console.error("Error cargando materias:", err);
    }
  }

  async function cargarAlumnosYNotas() {
    try {
      const { data: alumnosData } = await supabase
        .from("alumnos")
        .select("id, nombre, apellido")
        .eq("curso_id", cursoSeleccionado)
        .order("apellido");

      const { data: notasData } = await supabase
        .from("notas")
        .select("*")
        .eq("curso_id", cursoSeleccionado)
        .eq("asignatura_id", asignaturaSeleccionada)
        .eq("periodo", periodo);

      const estadoNotasInicial: Record<string, any> = {};
      alumnosData?.forEach(al => {
        const registroExistente = notasData?.find(n => n.alumno_id === al.id);
        estadoNotasInicial[al.id] = {
          nota_1: registroExistente?.nota_1 || "",
          nota_2: registroExistente?.nota_2 || "",
          nota_3: registroExistente?.nota_3 || "",
          nota_4: registroExistente?.nota_4 || "",
          nota_5: registroExistente?.nota_5 || "",
          promedio: registroExistente?.promedio || ""
        };
      });

      setAlumnos(alumnosData || []);
      setCuadernoNotas(estadoNotasInicial);
    } catch (error) {
      console.error("Error cargando planilla de alumnos:", error);
    }
  }

  function handleCambioNota(alumnoId: string, campoNota: string, valor: string) {
    let notaFormateada = valor.replace(",", ".");
    setCuadernoNotas(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], [campoNota]: notaFormateada }
    }));
  }

  function calcularPromedios() {
    const copiaCuaderno = { ...cuadernoNotas };

    alumnos.forEach(al => {
      const notasAlumno = copiaCuaderno[al.id];
      if (!notasAlumno) return;

      const valores = [
        parseFloat(notasAlumno.nota_1),
        parseFloat(notasAlumno.nota_2),
        parseFloat(notasAlumno.nota_3),
        parseFloat(notasAlumno.nota_4),
        parseFloat(notasAlumno.nota_5)
      ].filter(n => !isNaN(n) && n >= 1.0 && n <= 7.0);

      if (valores.length > 0) {
        const suma = valores.reduce((acc, curr) => acc + curr, 0);
        const prom = (Math.round((suma / valores.length) * 10) / 10).toFixed(1);
        copiaCuaderno[al.id].promedio = prom;
      } else {
        copiaCuaderno[al.id].promedio = "";
      }
    });

    setCuadernoNotas(copiaCuaderno);
    toast.success("✓ Promedios calculados con éxito.");
  }

  async function guardarNotas() {
    setGuardando(true);
    try {
      const registros = alumnos.map(al => {
        const n = cuadernoNotas[al.id];
        return {
          alumno_id: al.id,
          curso_id: cursoSeleccionado,
          asignatura_id: asignaturaSeleccionada,
          periodo: periodo,
          nota_1: n?.nota_1 !== "" ? parseFloat(n?.nota_1) : null,
          nota_2: n?.nota_2 !== "" ? parseFloat(n?.nota_2) : null,
          nota_3: n?.nota_3 !== "" ? parseFloat(n?.nota_3) : null,
          nota_4: n?.nota_4 !== "" ? parseFloat(n?.nota_4) : null,
          nota_5: n?.nota_5 !== "" ? parseFloat(n?.nota_5) : null,
          promedio: n?.promedio !== "" ? parseFloat(n?.promedio) : null
        };
      });

      const { error } = await supabase
        .from("notas")
        .upsert(registros, { onConflict: "alumno_id,curso_id,asignatura_id,periodo" });

      if (error) throw error;
      toast.success("✓ Libro de calificaciones actualizado.");
      cargarAlumnosYNotas();
    } catch (err: any) {
      toast.error("✗ Error al registrar calificaciones: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (inicializando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 font-medium text-sm space-y-2">
        <Loader2 className="size-6 text-blue-600 animate-spin" />
        <p>Sincronizando actas de calificaciones...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-sm">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {esAdmin ? "Libro de Calificaciones Maestro" : "Ingreso de Notas - Mis Cursos"}
          </h2>
          <p className="text-slate-500 mt-1">
            {esAdmin 
              ? "Ingreso global institucional de evaluaciones parciales y promedios." 
              : "Registra y calcula las calificaciones parciales de tus estudiantes autorizados."}
          </p>
        </div>
        {!esAdmin && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold text-xs uppercase tracking-wider">
            <UserCheck className="size-4" /> Panel Docente
          </div>
        )}
      </div>

      <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">1. Cursos Asignados</label>
          <select 
            className="w-full h-10 border rounded-lg px-3 bg-white text-sm font-medium focus:outline-none"
            value={cursoSeleccionado}
            onChange={(e) => setCursoSeleccionado(e.target.value)}
          >
            <option value="">{esAdmin ? "-- Elige un Curso --" : "-- Selecciona tu Curso --"}</option>
            {cursosDisponibles.map(c => (
              <option key={c.id} value={c.id}>
                {c.nivel === "basica" || c.nivel === "Básica" ? "Básica" : "Media"} {c.numero}° {c.letra}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">2. Asignaturas Disponibles</label>
          <select 
            className="w-full h-10 border rounded-lg px-3 bg-white text-sm font-medium focus:outline-none"
            value={asignaturaSeleccionada}
            onChange={(e) => setAsignaturaSeleccionada(e.target.value)}
            disabled={!cursoSeleccionado}
          >
            <option value="">-- Elige la Asignatura --</option>
            {asignaturasDelCurso.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">3. Periodo Académico</label>
          <select 
            className="w-full h-10 border rounded-lg px-3 bg-white text-sm font-medium focus:outline-none"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="1">Primer Semestre</option>
            <option value="2">Segundo Semestre</option>
          </select>
        </div>
      </Card>

      {/* PLANILLA RECTANGULAR DE EVALUACIONES */}
      {asignaturaSeleccionada ? (
        <Card className="p-6 border shadow-sm space-y-4 bg-white">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-800 uppercase tracking-wide">
                Planilla de Evaluaciones
              </h3>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={calcularPromedios} 
                variant="outline"
                className="text-xs font-bold text-blue-600 border-blue-200 hover:bg-blue-50 uppercase tracking-wider"
                disabled={alumnos.length === 0}
              >
                <Calculator className="size-4 mr-1.5"/> Calcular Promedios
              </Button>
              <Button 
                onClick={guardarNotas} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider"
                disabled={guardando || alumnos.length === 0}
              >
                <Save className="size-4 mr-1.5"/> {guardando ? "Guardando..." : "Guardar Calificaciones"}
              </Button>
            </div>
          </div>

          {alumnos.length === 0 ? (
            <p className="text-slate-400 italic text-center py-8">No hay alumnos matriculados en este curso todavía.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 text-xs uppercase pl-4">Estudiante</TableHead>
                    {['N1', 'N2', 'N3', 'N4', 'N5'].map((nLabel) => (
                      <TableHead key={nLabel} className="font-bold text-slate-700 text-xs uppercase text-center w-20">{nLabel}</TableHead>
                    ))}
                    <TableHead className="font-bold text-slate-900 text-xs uppercase text-center w-24 bg-slate-100">Promedio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alumnos.map((al) => (
                    <TableRow key={al.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-semibold text-slate-800 text-xs uppercase pl-4">
                        {al.apellido}, {al.nombre}
                      </TableCell>
                      
                      {['nota_1', 'nota_2', 'nota_3', 'nota_4', 'nota_5'].map((campo) => (
                        <TableCell key={campo} className="text-center p-2">
                          <input
                            type="text"
                            maxLength={3}
                            placeholder="1.0"
                            className="border text-center text-xs font-bold rounded-md w-12 h-8 bg-slate-50/50 focus:bg-white focus:outline-none"
                            value={cuadernoNotas[al.id]?.[campo] || ""}
                            onChange={(e) => handleCambioNota(al.id, campo, e.target.value)}
                          />
                        </TableCell>
                      ))}

                      <TableCell className="text-center font-bold text-sm bg-slate-100/70 p-2">
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-black",
                          parseFloat(cuadernoNotas[al.id]?.promedio) >= 4.0 
                            ? "text-blue-700 bg-blue-50" 
                            : cuadernoNotas[al.id]?.promedio 
                              ? "text-red-600 bg-red-50" 
                              : "text-slate-400"
                        )}>
                          {cuadernoNotas[al.id]?.promedio || "- -"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12 text-center border-dashed border-2 flex flex-col items-center justify-center text-slate-400 bg-slate-50/40">
          <BookOpen className="size-12 text-slate-300 mb-2" />
          <p className="font-medium">Selecciona un curso y una asignatura para desplegar la planilla de calificaciones.</p>
        </Card>
      )}
    </div>
  );
}