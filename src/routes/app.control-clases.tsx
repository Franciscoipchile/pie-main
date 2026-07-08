import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/store";
import { supabase } from "@/lib/supabase";
import { LogOut, LogIn, Clock, DoorOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/control-clases")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = useAuth.getState().user?.role;
    
    // Simplificado según tus roles reales de la app y corrigiendo la redirección a una ruta válida
    if (role !== "admin" && role !== "encargada") {
      throw redirect({ to: "/app" });
    }
  },
  component: ControlClasesView,
});

function ControlClasesView() {
  const user = useAuth((s) => s.user);

  // Estados para la carga de datos
  const [alumnosPie, setAlumnosPie] = useState<any[]>([]);
  const [historialSalidas, setHistorialSalidas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para el flujo de registrar SALIDA
  const [salidaOpen, setSalidaOpen] = useState(false);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<any>(null);
  const [motivo, setMotivo] = useState("");
  const [tipoApoyo, setTipoApoyo] = useState("pedagogico");

  // Estados para el flujo de registrar RETORNO
  const [retornoOpen, setRetornoOpen] = useState(false);
  const [intervencionActiva, setIntervencionActiva] = useState<any>(null);
  const [resultado, setResultado] = useState("");

  // 1. CARGAR DATOS EN VIVO DESDE SUPABASE
  const cargarDatosSincronizados = async () => {
    setLoading(true);
    try {
      // Obtener todos los alumnos inscritos en el Programa PIE
      const { data: alPIE } = await supabase
        .from("alumnos")
        .select(`
          id, nombre, apellido, rut, tipo_nee,
          cursos (numero, letra, nivel)
        `)
        .eq("en_pie", true);

      // Obtener el historial de intervenciones del día de hoy
      const { data: intervenciones } = await supabase
        .from("intervenciones_pie")
        .select(`
          id, fecha, hora_salida, hora_retorno, motivo, resultado, tipo_apoyo, alumno_id,
          alumnos (nombre, apellido, curso_id, cursos(numero, letra, nivel)),
          usuarios (nombre, apellido)
        `)
        .order("creado_at", { ascending: false });

      if (alPIE) setAlumnosPie(alPIE);
      if (intervenciones) setHistorialSalidas(intervenciones);
    } catch (err: any) {
      toast.error("Error de sincronización con el servidor: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosSincronizados();
  }, []);

  // 2. DISPARAR REGISTRO DE SALIDA (Abre Modal)
  const iniciarSalida = (alumno: any) => {
    setAlumnoSeleccionado(alumno);
    setMotivo("");
    setTipoApoyo("pedagogico");
    setSalidaOpen(true);
  };

  // Guardar salida en Supabase
  const confirmarSalida = async () => {
    if (!motivo.trim()) {
      toast.error("Por favor, describe el motivo de la salida del estudiante.");
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { error } = await supabase.from("intervenciones_pie").insert({
        alumno_id: alumnoSeleccionado.id,
        profesor_id: authUser?.id,
        motivo: motivo.trim(),
        tipo_apoyo: tipoApoyo,
      });

      if (error) throw error;

      toast.success(`Salida registrada para ${alumnoSeleccionado.nombre}.`);
      setSalidaOpen(false);
      cargarDatosSincronizados();
    } catch (err: any) {
      toast.error("Error al asentar salida: " + err.message);
    }
  };

  // 3. DISPARAR REGISTRO DE RETORNO (Abre Modal)
  const iniciarRetorno = (intervencion: any) => {
    setIntervencionActiva(intervencion);
    setResultado("");
    setRetornoOpen(true);
  };

  // Actualizar hora de retorno y resultado en Supabase
  const confirmarRetorno = async () => {
    if (!resultado.trim()) {
      toast.error("Por favor, añade una bitácora del resultado antes de dar el reingreso.");
      return;
    }

    try {
      // Marcamos la hora de retorno actual usando la hora del servidor de Supabase de manera implícita o una estampa ISO
      const horaActualStr = new Date().toLocaleTimeString("es-CL", { hour12: false });

      const { error } = await supabase
        .from("intervenciones_pie")
        .update({
          hora_retorno: horaActualStr,
          resultado: resultado.trim(),
        })
        .eq("id", intervencionActiva.id);

      if (error) throw error;

      toast.success("Retorno a la sala ordinaria registrado correctamente.");
      setRetornoOpen(false);
      cargarDatosSincronizados();
    } catch (err: any) {
      toast.error("Error al asentar retorno: " + err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 text-xs">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Control de Alumnos en Aula</h2>
        <p className="text-sm text-muted-foreground">Monitoreo en tiempo real de salidas temporales y apoyos del equipo PIE.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* PANEL IZQUIERDO: NÓMINA DE ALUMNOS PIE */}
        <Card className="xl:col-span-1 p-4 space-y-3 shadow-sm border">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
            <DoorOpen className="size-4 text-primary" /> Nómina Estudiantes PIE
          </h3>
          
          {loading ? (
            <p className="text-center py-4 animate-pulse">Buscando alumnos inscritos...</p>
          ) : alumnosPie.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No hay alumnos PIE matriculados.</p>
          ) : (
            <div className="divide-y max-h-[60vh] overflow-y-auto pr-1">
              {alumnosPie.map((alumno) => {
                // Verificar si el alumno actualmente se encuentra fuera de la sala (tiene salida sin retorno)
                const estaFuera = historialSalidas.some(
                  (h) => h.alumno_id === alumno.id && !h.hora_retorno
                );

                return (
                  <div key={alumno.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-700 uppercase">{alumno.apellido}, {alumno.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {alumno.cursos ? `${alumno.cursos.numero}° ${alumno.cursos.nivel === 'basica' ? 'Básico' : 'Medio'} ${alumno.cursos.letra}` : "Sin Curso"} • <span className="font-semibold text-primary">{alumno.tipo_nee}</span>
                      </p>
                    </div>
                    
                    {estaFuera ? (
                      <Badge variant="destructive" className="animate-pulse font-bold text-[10px]">
                        En Intervención
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => iniciarSalida(alumno)}
                        className="h-8 gap-1 text-[11px] border-slate-200 hover:bg-slate-50 text-slate-700"
                      >
                        <LogOut className="size-3 text-destructive" /> Sacar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* PANEL DER: HISTORIAL Y TRAZABILIDAD DEL DÍA */}
        <Card className="xl:col-span-2 p-4 space-y-3 shadow-sm border">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
            <Clock className="size-4 text-slate-500" /> Bitácora de Trazabilidad Diaria
          </h3>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="uppercase text-[10px] font-bold">
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Horarios</TableHead>
                  <TableHead>Motivo / Apoyo</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historialSalidas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No se registran bitácoras de salida para la fecha actual.
                    </TableCell>
                  </TableRow>
                ) : (
                  historialSalidas.map((item) => {
                    const alumnoData = item.alumnos || {};
                    const cursoData = alumnoData.cursos || {};

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-800 uppercase">
                          {alumnoData.apellido}, {alumnoData.nombre}
                        </TableCell>
                        <TableCell>
                          {cursoData.numero ? `${cursoData.numero}° ${cursoData.letra}` : "—"}
                        </TableCell>
                        <TableCell className="space-y-0.5 whitespace-nowrap">
                          <p className="text-destructive font-medium flex items-center gap-1">⏱ Salida: {item.hora_salida ? item.hora_salida.substring(0,5) : "—"}</p>
                          <p className={item.hora_retorno ? "text-emerald-600 font-medium" : "text-amber-500 font-bold animate-pulse"}>
                            {item.hora_retorno ? `✓ Volvió: ${item.hora_retorno.substring(0,5)}` : "⏳ Fuera de sala"}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          <Badge variant="secondary" className="mb-1 text-[9px] uppercase font-bold">
                            {item.tipo_apoyo}
                          </Badge>
                          <p className="text-slate-600">{item.motivo}</p>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate italic text-muted-foreground">
                          {item.resultado ?? "Pendiente — en progreso"}
                        </TableCell>
                        <TableCell className="text-right">
                          {!item.hora_retorno ? (
                            <Button
                              size="sm"
                              onClick={() => iniciarRetorno(item)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px]"
                            >
                              <LogIn className="size-3" /> Retorno
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                              Finalizado
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* DIÁLOGO MODAL: REGISTRAR SALIDA */}
      <Dialog open={salidaOpen} onOpenChange={setSalidaOpen}>
        <DialogContent className="text-xs max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Salida de Estudiante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="bg-slate-50 p-2.5 rounded-lg border font-medium text-slate-700">
              Alumno: <span className="uppercase font-bold">{alumnoSeleccionado?.apellido}, {alumnoSeleccionado?.nombre}</span>
            </p>
            
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Enfoque de la Intervención</Label>
              <select
                className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700"
                value={tipoApoyo}
                onChange={(e) => setTipoApoyo(e.target.value)}
              >
                <option value="pedagogico">Apoyo Pedagógico / Aula de Recursos</option>
                <option value="emocional_conductual">Contención Emocional / Conductual</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Motivo / Justificación de la Salida *</Label>
              <Textarea
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Reforzamiento de lectoescritura en módulo psicopedagógico..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSalidaOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarSalida} className="bg-destructive hover:bg-destructive/90 text-white font-bold">
              <LogOut className="size-4" /> Autorizar Salida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO MODAL: REGISTRAR RETORNO */}
      <Dialog open={retornoOpen} onOpenChange={setRetornoOpen}>
        <DialogContent className="text-xs max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Retorno a la Sala Comunitaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="bg-slate-50 p-2.5 rounded-lg border font-medium text-slate-700">
              Alumno: <span className="uppercase font-bold">{intervencionActiva?.alumnos?.apellido}, {intervencionActiva?.alumnos?.nombre}</span>
            </p>
            
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Resultado / Bitácora de la Intervención *</Label>
              <Textarea
                rows={4}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder="Describe brevemente los avances logrados, observaciones conductuales o acuerdos alcanzados durante el periodo fuera de la sala..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setRetornoOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarRetorno} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <LogIn className="size-4" /> Confirmar Reingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}