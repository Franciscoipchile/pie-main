import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, X, AlertCircle } from "lucide-react";

export interface Asignacion {
  asignaturaId: string;
  asignaturaNombre: string;
  cursosIds: string[]; // Mantener compatibilidad con el esquema de guardado del backend
}

interface AsignacionesEditorProps {
  value: Asignacion[];
  onChange: (value: Asignacion[]) => void;
}

export function AsignacionesEditor({ value, onChange }: AsignacionesEditorProps) {
  const [cursosMaestros, setCursosMaestros] = useState<any[]>([]);
  // Almacenará las asignaturas disponibles por cada fila indexada según la malla del curso electo
  const [asignaturasPorFila, setAsignaturasPorFila] = useState<{ [key: number]: any[] }>({});
  const [loadingMallas, setLoadingMallas] = useState<{ [key: number]: boolean }>({});

  // 1. Cargar la lista completa de cursos ordenados al arrancar
  useEffect(() => {
    const cargarCursos = async () => {
      const { data: cur, error } = await supabase.from("cursos").select("*");
      if (error) console.error(error);
      
      if (cur) {
        const ordenados = cur.sort((a, b) => {
          if (a.nivel !== b.nivel) return a.nivel === "basica" ? -1 : 1;
          if (a.numero !== b.numero) return a.numero - b.numero;
          return a.letra.localeCompare(b.letra);
        });
        setCursosMaestros(ordenados);
      }
    };
    cargarCursos();
  }, []);

  // 2. Efecto reactivo para hidratar las asignaturas si el componente se carga con valores existentes (edición)
  useEffect(() => {
    value.forEach((fila, idx) => {
      if (fila.cursosIds.length > 0 && !asignaturasPorFila[idx]) {
        cargarAsignaturasDeMalla(idx, fila.cursosIds[0]);
      }
    });
  }, [value]);

  // Función clave: Consulta la tabla intermedia para extraer qué ramos pertenecen al curso electo
  const cargarAsignaturasDeMalla = async (index: number, cursoId: string) => {
    if (!cursoId) {
      setAsignaturasPorFila(prev => ({ ...prev, [index]: [] }));
      return;
    }

    setLoadingMallas(prev => ({ ...prev, [index]: true }));
    try {
      const { data, error } = await supabase
        .from("curso_asignaturas")
        .select(`
          asignatura_id,
          asignaturas (id, nombre)
        `)
        .eq("curso_id", cursoId);

      if (error) throw error;

      if (data) {
        // Formatear y extraer el objeto de la asignatura unida relacionalmente
        const listaAsignaturas = data
          .map((item: any) => item.asignaturas)
          .filter(Boolean);
        
        setAsignaturasPorFila(prev => ({ ...prev, [index]: listaAsignaturas }));
      }
    } catch (err) {
      console.error("Error al leer asignaturas de la malla:", err);
    } finally {
      setLoadingMallas(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleAgregarFila = () => {
    onChange([...value, { asignaturaId: "", asignaturaNombre: "", cursosIds: [] }]);
  };

  const handleRemoverFila = (index: number) => {
    const nuevasAsignaciones = value.filter((_, i) => i !== index);
    
    // Limpiar el estado interno de asignaturas para mantener el orden de los índices correcto
    const nuevoMapeoAsig: { [key: number]: any[] } = {};
    nuevasAsignaciones.forEach((fila, idx) => {
      // Reubicar la caché de mallas según el nuevo orden
      const viejoIdx = index <= idx ? idx + 1 : idx;
      if (asignaturasPorFila[viejoIdx]) {
        nuevoMapeoAsig[idx] = asignaturasPorFila[viejoIdx];
      }
    });
    
    setAsignaturasPorFila(nuevoMapeoAsig);
    onChange(nuevasAsignaciones);
  };

  const handleCambiarCurso = async (index: number, cursoId: string) => {
    const nuevas = [...value];
    // Reiniciar los campos de la asignatura al cambiar el curso raíz de la fila para evitar inconsistencias
    nuevas[index] = {
      ...nuevas[index],
      cursosIds: cursoId ? [cursoId] : [],
      asignaturaId: "",
      asignaturaNombre: ""
    };
    onChange(nuevas);
    
    // Disparar la consulta en tiempo real a Supabase para rellenar el segundo selector
    await cargarAsignaturasDeMalla(index, cursoId);
  };

  const handleCambiarAsignatura = (index: number, asigId: string) => {
    const listaDisponible = asignaturasPorFila[index] || [];
    const seleccionada = listaDisponible.find(a => a.id === asigId);
    
    const nuevas = [...value];
    nuevas[index] = {
      ...nuevas[index],
      asignaturaId: asigId,
      asignaturaNombre: seleccionada ? seleccionada.nombre : ""
    };
    onChange(nuevas);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600"> Distribución Curricular Docente</label>
          <p className="text-[11px] text-muted-foreground">Configura las materias específicas que impartirá este profesor en cada nivel.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAgregarFila}
          className="gap-1 text-xs h-9 bg-slate-50 border-slate-200 hover:bg-slate-100 font-medium text-slate-700"
        >
          <Plus className="size-3.5 text-primary" /> Asignar Cátedra
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-xs text-muted-foreground bg-muted/30 p-5 rounded-xl text-center border border-dashed border-slate-200">
          No hay cursos ni asignaturas asignadas a este profesor. Utiliza el botón de arriba para añadir bloques curriculares.
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((fila, index) => {
            const cursoActualId = fila.cursosIds[0] || "";
            const opcionesAsignaturas = asignaturasPorFila[index] || [];
            const estaCargando = loadingMallas[index];

            return (
              <div key={index} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100 transition-all">
                
                {/* SELECTOR 1: CURSO ESPECÍFICO */}
                <div className="w-full sm:flex-1 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block px-0.5">Curso / Grado</span>
                  <select
                    className="w-full h-10 border rounded-lg px-3 bg-background text-xs border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium text-slate-700"
                    value={cursoActualId}
                    onChange={(e) => handleCambiarCurso(index, e.target.value)}
                  >
                    <option value="">Selecciona un curso...</option>
                    {cursosMaestros.map((curso) => (
                      <option key={curso.id} value={curso.id}>
                        {curso.numero}° {curso.letra} ({curso.nivel === "basica" ? "Básico" : "Medio"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* SELECTOR 2: ASIGNATURA FILTRADA POR LA MALLA */}
                <div className="w-full sm:flex-1 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block px-0.5">
                    Asignatura {estaCargando ? " (Cargando Malla...)" : ""}
                  </span>
                  <select
                    className="w-full h-10 border rounded-lg px-3 bg-background text-xs border-input focus:outline-none focus:ring-1 focus:ring-primary font-semibold text-slate-700 uppercase tracking-wide disabled:opacity-60"
                    value={fila.asignaturaId}
                    onChange={(e) => handleCambiarAsignatura(index, e.target.value)}
                    disabled={!cursoActualId || estaCargando}
                  >
                    {estaCargando ? (
                      <option value="">Sincronizando plan curricular...</option>
                    ) : !cursoActualId ? (
                      <option value="">$\leftarrow$ Selecciona primero un curso</option>
                    ) : opcionesAsignaturas.length === 0 ? (
                      <option value="">⚠️ Este curso no tiene mallas registradas</option>
                    ) : (
                      <>
                        <option value="">Seleccionar Asignatura de la Malla...</option>
                        {opcionesAsignaturas.map((a: any) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre.toUpperCase()}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {/* BOTÓN QUITAR FILA */}
                <div className="flex items-end justify-end pt-3 sm:pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoverFila(index)}
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors border"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}