import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddAlumnoDialog } from "@/components/AddAlumnoDialog";
import { useAuth } from "@/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export const Route = createFileRoute("/app/alumnos-pie")({
  component: AlumnosPieRoute,
});

function AlumnosPieRoute() {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cursosDb, setCursosDb] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipoAlumno, setFiltroTipoAlumno] = useState("todos"); 
  const [cursoFiltro, setCursoFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [esEncargada, setEsEncargada] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Obtener los datos del usuario directamente del token de Supabase para blindar el rol
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: usuarioDb } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", authUser.id)
        .single();

      const rolReal = usuarioDb?.rol || user?.role;
      const modoEncargada = rolReal === "encargada" || rolReal === "profesora_pie";
      const isProfesor = rolReal === "profesor";
      setEsEncargada(modoEncargada);

      // 2. Construcción de la consulta limpia
      let query = supabase
        .from("alumnos")
        .select(`
          id, nombre, apellido, rut, en_pie, tipo_nee, curso_id,
          cursos (id, numero, letra, nivel),
          usuarios (nombre, apellido)
        `);

      let listadoCursosIds: string[] = [];

      // 🎯 COMPROMISO ABSOLUTO: Si es encargada PIE, forzar que solo traiga en_pie = true
      if (modoEncargada) {
        query = query.eq("en_pie", true);
      } else if (isProfesor) {
        // Cargar los cursos asignados al profesor
        const { data: cargas } = await supabase
          .from("cargas_academicas")
          .select("curso_id")
          .eq("profesor_id", authUser.id);
        
        listadoCursosIds = cargas?.map(c => c.curso_id).filter(Boolean) || [];
        
        if (listadoCursosIds.length > 0) {
          query = query.in("curso_id", listadoCursosIds);
        } else {
          // Si no tiene asignaciones, forzar a que no retorne ningún alumno
          query = query.eq("curso_id", "00000000-0000-0000-0000-000000000000");
        }
      }

      const { data: dataAlumnos, error: errAlumnos } = await query.order("apellido", { ascending: true });
      
      if (errAlumnos) throw errAlumnos;
      if (dataAlumnos) setAlumnos(dataAlumnos || []);

      const { data: dataCursos } = await supabase.from("cursos").select("*");
      if (dataCursos) {
        if (isProfesor) {
          // Filtrar también el listado del selector de cursos para mostrar solo los asignados
          setCursosDb(dataCursos.filter(c => listadoCursosIds.includes(c.id)));
        } else {
          setCursosDb(dataCursos);
        }
      }
    } catch (err) {
      console.error("Error al cargar la nómina segmentada:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [user]);

  // Filtrado reactivo en el cliente
  const alumnosFiltrados = alumnos.filter((alumno) => {
    const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`.toLowerCase();
    const cumpleBusqueda =
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      alumno.rut.toLowerCase().includes(busqueda.toLowerCase());

    const cumpleCurso = cursoFiltro === "todos" || alumno.curso_id === cursoFiltro;

    let cumpleTipo = true;
    if (esEncargada) {
      // Si es encargada, forzar doble candado en el cliente para que solo pasen alumnos PIE
      cumpleTipo = alumno.en_pie === true;
    } else {
      if (filtroTipoAlumno === "regulares") {
        cumpleTipo = !alumno.en_pie;
      } else if (filtroTipoAlumno === "pie") {
        cumpleTipo = alumno.en_pie;
      }
    }

    return cumpleBusqueda && cumpleCurso && cumpleTipo;
  });

  return (
    <div className="space-y-6 text-xs font-medium uppercase">
      {/* Encabezado Adaptativo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {esEncargada ? "Nómina Oficial del Programa PIE" : "Nómina General de Alumnos"}
          </h2>
          <p className="text-sm text-muted-foreground font-normal lowercase mt-0.5">
            {esEncargada 
              ? "Expedientes de matrícula integrada bajo supervisión del Decreto 170."
              : "Visualiza y gestiona tanto alumnos regulares como pertenecientes al programa PIE."}
          </p>
        </div>
        {/* 🎯 RESTRICCIÓN: Solo el administrador puede matricular o agregar alumnos */}
        {!esEncargada && <AddAlumnoDialog />}
      </div>

      {/* Herramientas de Filtrado */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-10 font-medium"
            placeholder="Buscar por nombre, apellido o rut..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Ocultar selector de tipo de matrícula si es Encargada PIE, ya que es redundante */}
          {!esEncargada && (
            <select
              className="border rounded-lg px-3 py-2 bg-background text-xs min-w-[160px] h-10 border-input font-bold text-slate-700 focus:outline-none"
              value={filtroTipoAlumno}
              onChange={(e) => setFiltroTipoAlumno(e.target.value)}
            >
              <option value="todos">Todos los alumnos</option>
              <option value="regulares">Solo Regulares</option>
              <option value="pie">Solo Integración (PIE)</option>
            </select>
          )}

          {/* Selector de Curso */}
          <select
            className="border rounded-lg px-3 py-2 bg-background text-xs min-w-[180px] h-10 border-input font-bold text-slate-700 focus:outline-none"
            value={cursoFiltro}
            onChange={(e) => setCursoFiltro(e.target.value)}
          >
            <option value="todos">Todos los cursos</option>
            {cursosDb
              .sort((a, b) => a.numero - b.numero || a.nivel.localeCompare(b.nivel) || a.letra.localeCompare(b.letra))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero}° {c.nivel === "basica" ? "Básico" : "Medio"} {c.letra}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <Card className="p-0 overflow-hidden border shadow-sm bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 text-[10px] font-bold text-slate-600">
              <TableRow>
                <TableHead>Alumno / Estudiante</TableHead>
                <TableHead>RUT</TableHead>
                <TableHead>Curso Regular</TableHead>
                <TableHead>Clasificación / NEE</TableHead>
                <TableHead>Profesional de Apoyo</TableHead>
                <TableHead className="text-right">Régimen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-bold animate-pulse">
                    Sincronizando nómina oficial...
                  </TableCell>
                </TableRow>
              ) : alumnosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                    No se encontraron alumnos que coincidan con los criterios.
                  </TableCell>
                </TableRow>
              ) : (
                alumnosFiltrados.map((alumno) => (
                  <TableRow key={alumno.id} className="hover:bg-slate-50/60 transition-colors text-slate-700 text-[11px]">
                    <TableCell className="font-bold text-slate-900">
                      {alumno.apellido}, {alumno.nombre}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-slate-400 font-bold">
                      {alumno.rut}
                    </TableCell>
                    <TableCell className="font-bold text-slate-600">
                      {alumno.cursos 
                        ? `${alumno.cursos.numero}° ${alumno.cursos.nivel === "basica" ? "Básico" : "Medio"} ${alumno.cursos.letra}` 
                        : "No asignado"}
                    </TableCell>
                    <TableCell>
                      {alumno.en_pie && alumno.tipo_nee ? (
                        <NeeBadge type={alumno.tipo_nee} />
                      ) : (
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 rounded border font-bold">
                          Sin NEE
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-bold">
                      {alumno.en_pie && alumno.usuarios 
                        ? `${alumno.usuarios.nombre} ${alumno.usuarios.apellido}` 
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={alumno.en_pie ? "default" : "outline"} className={alumno.en_pie ? "bg-indigo-600 text-white font-bold text-[9px]" : "font-semibold text-slate-400 text-[9px]"}>
                        {alumno.en_pie ? "PIE" : "Regular"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// Componente local interno robusto para pintar el tipo de NEE sin dependencias rotas
function NeeBadge({ type }: { type: string }) {
  const estilos: Record<string, string> = {
    TEL: "bg-purple-50 text-purple-700 border-purple-200",
    TDAH: "bg-blue-50 text-blue-700 border-blue-200",
    DEA: "bg-amber-50 text-amber-700 border-amber-200",
    TEA: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const claseActual = estilos[type] || "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${claseActual}`}>
      {type}
    </span>
  );
}