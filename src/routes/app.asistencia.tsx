import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Calendar, BookOpen, AlertTriangle, UserCheck, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/asistencia")({
  component: AsistenciaHibridaView,
});

function AsistenciaHibridaView() {
  const [usuarioReal, setUsuarioReal] = useState<any>(null);
  const [esAdmin, setEsAdmin] = useState(false);

  // ----- Estados de Datos Maestros -----
  const [bloques, setBloques] = useState<any[]>([]);
  const [cursosDisponibles, setCursosDisponibles] = useState<any[]>([]);
  const [inicializando, setInicializando] = useState(true);
  
  // ----- Estados de Selección -----
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6 ? "1" : day.toString();
  });
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<any>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

  // ----- Estados de Alumnos, Asistencia y Resumen Único -----
  const [mallaBloques, setMallaBloques] = useState<any[]>([]);
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<Record<string, { estado: string }>>({});
  const [resumenClase, setResumenClase] = useState(""); // <--- UN SOLO CUADRO POR BLOQUE
  const [guardando, setGuardando] = useState(false);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);

  useEffect(() => {
    async function resolverSesionYDatos() {
      try {
        setInicializando(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("No se encontró una sesión activa.");
          setInicializando(false);
          return;
        }
        setUsuarioReal(user);

        const { data: perfilBd } = await supabase
          .from("usuarios")
          .select("rol")
          .eq("id", user.id)
          .maybeSingle();

        const valorEsAdmin = perfilBd?.rol === "administrador";
        setEsAdmin(valorEsAdmin);

        const { data: bData } = await supabase.from("bloques_horarios").select("*").order("orden");
        setBloques(bData || []);

        if (valorEsAdmin) {
          const { data: cData } = await supabase.from("cursos").select("*").order("nivel, numero");
          setCursosDisponibles(cData || []);
        } else {
          const { data: cargas } = await supabase
            .from("cargas_academicas")
            .select("curso_id, cursos(id, numero, letra, nivel)")
            .eq("profesor_id", user.id);
          
          const cursosFiltrados = Array.from(new Map(cargas?.map(item => [item.curso_id, item.cursos])).values());
          setCursosDisponibles(cursosFiltrados.filter(Boolean));
        }

      } catch (err) {
        console.error("Error crítico de inicialización:", err);
      } finally {
        setInicializando(false);
      }
    }

    resolverSesionYDatos();
  }, []);

  useEffect(() => {
    if (cursoSeleccionado && diaSeleccionado && usuarioReal) {
      cargarMallaHorariaCurso();
    }
    setBloqueSeleccionado(null);
    setAlumnos([]);
    setAsistencias({});
    setResumenClase("");
  }, [cursoSeleccionado, diaSeleccionado, fecha]); // Al cambiar fecha también limpia

  async function cargarMallaHorariaCurso() {
    try {
      const { data: malla } = await supabase
        .from("horarios_curso")
        .select("*, asignaturas(id, nombre), bloques_horarios(id, nombre, hora_inicio, hora_fin)")
        .eq("curso_id", cursoSeleccionado)
        .eq("dia_semana", diaSeleccionado);
      
      if (esAdmin) {
        setMallaBloques(malla || []);
      } else {
        const { data: misMaterias } = await supabase
          .from("cargas_academicas")
          .select("asignatura_id")
          .eq("profesor_id", usuarioReal.id)
          .eq("curso_id", cursoSeleccionado);
        
        const idsMisMaterias = misMaterias?.map(m => m.asignatura_id) || [];
        const mallaFiltrada = malla?.filter(item => idsMisMaterias.includes(item.asignatura_id)) || [];
        setMallaBloques(mallaFiltrada);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSeleccionarBloqueMateria(horarioCurso: any) {
    setBloqueSeleccionado(horarioCurso);
    setCargandoAlumnos(true);
    setAsistencias({});
    setResumenClase("");

    try {
      const { data: alumnosData } = await supabase
        .from("alumnos")
        .select("id, nombre, apellido")
        .eq("curso_id", cursoSeleccionado)
        .order("apellido");

      // Buscamos si ya existe la clase guardada en la tabla 'horarios' para sacar su resumen
      const { data: horarioReal } = await supabase
        .from("horarios")
        .select("id, resumen_clase")
        .eq("curso_id", cursoSeleccionado)
        .eq("bloque_id", horarioCurso.bloque_id)
        .eq("dia_semana", diaSeleccionado)
        .maybeSingle();

      if (horarioReal) {
        setResumenClase(horarioReal.resumen_clase || "");
        
        const { data: asigEx } = await supabase
          .from("asistencia")
          .select("alumno_id, estado")
          .eq("curso_id", cursoSeleccionado)
          .eq("fecha", fecha)
          .eq("horario_id", horarioReal.id);
        
        const mapaAsistencias: Record<string, { estado: string }> = {};
        alumnosData?.forEach(al => {
          const existente = asigEx?.find(a => a.alumno_id === al.id);
          mapaAsistencias[al.id] = {
            estado: existente?.estado || "presente"
          };
        });
        setAsistencias(mapaAsistencias);
      } else {
        const mapaAsistencias: Record<string, { estado: string }> = {};
        alumnosData?.forEach(al => {
          mapaAsistencias[al.id] = { estado: "presente" };
        });
        setAsistencias(mapaAsistencias);
      }

      setAlumnos(alumnosData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoAlumnos(false);
    }
  }

  async function handleGuardarAsistencia() {
    if (!bloqueSeleccionado || !usuarioReal) return;
    setGuardando(true);

    try {
      let profesorId = usuarioReal.id;

      if (esAdmin) {
        const { data: carga } = await supabase
          .from("cargas_academicas")
          .select("profesor_id")
          .eq("curso_id", cursoSeleccionado)
          .eq("asignatura_id", bloqueSeleccionado.asignatura_id)
          .maybeSingle();
        if (carga?.profesor_id) profesorId = carga.profesor_id;
      }

      let { data: horarioReal } = await supabase
        .from("horarios")
        .select("id")
        .eq("curso_id", cursoSeleccionado)
        .eq("bloque_id", bloqueSeleccionado.bloque_id)
        .eq("dia_semana", diaSeleccionado)
        .maybeSingle() as any || { data: null };

      let hRealId = horarioReal?.id;

      if (!hRealId) {
        // Creamos la clase guardando el RESUMEN GENERAL DEL BLOQUE
        const { data: nuevoHorario, error: errH } = await supabase
          .from("horarios")
          .insert({
            curso_id: cursoSeleccionado,
            bloque_id: bloqueSeleccionado.bloque_id,
            asignatura_id: bloqueSeleccionado.asignatura_id,
            profesor_id: profesorId,
            dia_semana: diaSeleccionado,
            resumen_clase: resumenClase || null // <--- Se guarda aquí
          })
          .select("id")
          .single();
        
        if (errH) throw errH;
        hRealId = nuevoHorario.id;
      } else {
        // Si el horario ya existía, actualizamos el resumen general del bloque
        const { error: errUpdate } = await supabase
          .from("horarios")
          .update({ resumen_clase: resumenClase || null })
          .eq("id", hRealId);
        
        if (errUpdate) throw errUpdate;
      }

      // Limpiamos asistencias anteriores del día para este bloque
      await supabase
        .from("asistencia")
        .delete()
        .eq("curso_id", cursoSeleccionado)
        .eq("fecha", fecha)
        .eq("horario_id", hRealId);

      // Insertamos la lista de alumnos limpia
      const registros = alumnos.map(al => ({
        alumno_id: al.id,
        curso_id: cursoSeleccionado,
        horario_id: hRealId,
        fecha: fecha,
        estado: asistencias[al.id]?.estado || "presente",
        observacion: null
      }));

      const { error } = await supabase.from("asistencia").insert(registros);
      if (error) throw error;

      toast.success("✓ Libro digital y resumen de clase guardados con éxito.");
    } catch (err: any) {
      toast.error("✗ Error al guardar el registro: " + err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (inicializando) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500 font-medium text-sm space-y-2">
        <Loader2 className="size-6 text-blue-600 animate-spin" />
        <p>Sincronizando libro digital de asistencia...</p>
      </div>
    );
  }

  if (bloques.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center space-y-4 mt-12">
        <AlertTriangle className="size-16 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No se detectan bloques de horarios configurados</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          El administrador debe inicializar los bloques de clases antes de gestionar la asistencia escolar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-sm">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {esAdmin ? "Control Maestro de Asistencia" : "Registro de Asistencia - Libro Digital"}
          </h2>
          <p className="text-slate-500 mt-1">
            {esAdmin 
              ? "Supervisión y toma de asistencia global institucional." 
              : `Registra la asistencia diaria de tus asignaturas autorizadas.`}
          </p>
        </div>
        {!esAdmin && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-2 font-semibold text-xs uppercase tracking-wider">
            <UserCheck className="size-4" /> Vista de Profesor
          </div>
        )}
      </div>

      <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border shadow-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">1. Cursos Autorizados</label>
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
          <label className="text-xs font-bold text-slate-600 uppercase">2. Día de la Semana</label>
          <select 
            className="w-full h-10 border rounded-lg px-3 bg-white text-sm focus:outline-none"
            value={diaSeleccionado}
            onChange={(e) => setDiaSeleccionado(e.target.value)}
          >
            {['Lunes','Martes','Miércoles','Jueves','Viernes'].map((d, i) => (
              <option key={d} value={i+1}>{d}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase">3. Fecha del Registro</label>
          <input 
            type="date"
            className="w-full h-10 border rounded-lg px-3 bg-white text-sm focus:outline-none"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </Card>

      {cursoSeleccionado && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <BookOpen className="size-4 text-blue-600"/> {esAdmin ? "Malla del Curso" : "Mis Bloques en este Curso"}
            </h3>
            
            {mallaBloques.length === 0 ? (
              <Card className="p-5 text-center text-slate-400 italic text-xs bg-slate-50 border-dashed">
                {esAdmin 
                  ? "Este curso no tiene asignaturas el día seleccionado." 
                  : "No tienes bloques horarios asignados en este curso para el día seleccionado."}
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {mallaBloques.map((mb) => {
                  const esSeleccionado = bloqueSeleccionado?.id === mb.id;
                  return (
                    <div
                      key={mb.id}
                      onClick={() => handleSeleccionarBloqueMateria(mb)}
                      className={cn(
                        "p-4 border rounded-xl cursor-pointer transition-all shadow-sm flex justify-between items-center select-none",
                        esSeleccionado 
                          ? "border-blue-600 bg-blue-600 text-white" 
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <div>
                        <p className={cn("text-xs font-bold", esSeleccionado ? "text-blue-100" : "text-slate-400")}>
                          {mb.bloques_horarios?.nombre}
                        </p>
                        <h4 className="font-bold text-sm uppercase mt-0.5">{mb.asignaturas?.nombre}</h4>
                      </div>
                      <span className={cn("text-xs font-medium", esSeleccionado ? "text-blue-100" : "text-slate-500")}>
                        {mb.bloques_horarios?.hora_inicio} - {mb.bloques_horarios?.hora_fin}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {bloqueSeleccionado ? (
              <Card className="p-6 border shadow-sm space-y-4">
                
                {/* NUEVO PANEL: RECUADRO ÚNICO PARA EL RESUMEN GENERAL DE LA CLASE */}
                <div className="bg-slate-50 p-4 border rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider">
                    <FileText className="size-4 text-blue-600" />
                    <span>Resumen General de la Clase / Contenido Dictado</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Escribe brevemente qué se enseñó en este bloque (Ej: Introducción a las fracciones, repaso para la prueba, lectura dirigida...)"
                    className="w-full p-2.5 text-xs rounded-lg border bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                    value={resumenClase}
                    onChange={(e) => setResumenClase(e.target.value)}
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-3 pt-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 uppercase">
                      Control de Asistencia - {bloqueSeleccionado.asignaturas?.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nómina oficial de estudiantes registrados
                    </p>
                  </div>
                  <Button 
                    onClick={handleGuardarAsistencia} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase"
                    disabled={guardando || alumnos.length === 0}
                  >
                    <Save className="size-4 mr-2"/> {guardando ? "Guardando..." : "Guardar Libro Digital"}
                  </Button>
                </div>

                {cargandoAlumnos ? (
                  <p className="text-xs text-muted-foreground animate-pulse py-4 text-center">Cargando nómina...</p>
                ) : alumnos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No hay alumnos matriculados en este curso.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700 text-xs uppercase">Estudiante</TableHead>
                          <TableHead className="font-bold text-slate-700 text-xs uppercase w-48">Estado Asistencia</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alumnos.map((al) => (
                          <TableRow key={al.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-semibold text-slate-800 text-xs uppercase">
                              {al.apellido}, {al.nombre}
                            </TableCell>
                            <TableCell>
                              <select
                                className={cn(
                                  "border rounded-md px-2.5 py-1.5 text-xs font-bold w-full focus:outline-none",
                                  asistencias[al.id]?.estado === "presente" 
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-700" 
                                    : "bg-rose-50 border-rose-300 text-rose-700"
                                )}
                                value={asistencias[al.id]?.estado || "presente"}
                                onChange={(e) => setAsistencias({
                                  ...asistencias,
                                  [al.id]: { ...asistencias[al.id], estado: e.target.value }
                                })}
                              >
                                <option value="presente">✓ Presente</option>
                                <option value="ausente">✗ Ausente</option>
                              </select>
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
                <Calendar className="size-12 text-slate-300 mb-2" />
                <p className="text-sm font-medium">Por favor selecciona un curso y luego haz clic en tu bloque/materia correspondiente para pasar asistencia.</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}