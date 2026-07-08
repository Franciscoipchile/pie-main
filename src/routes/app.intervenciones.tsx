import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store";
import { ClipboardPlus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { UserSelect } from "@/components/UserSelect";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/intervenciones")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = useAuth.getState().user?.role;
    if (role !== "encargada" && role !== "admin") {
      throw redirect({ to: "/app" });
    }
  },
  component: IntervencionesView,
});

const TIPOS_INTERVENCION = [
  "Evaluación Psicopedagógica",
  "Intervención Aula de Recursos",
  "Apoyo en Aula Común",
  "Atención Fonoaudiológica",
  "Evaluación Psicológica",
  "Entrevista de Apoderado"
];

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function IntervencionesView() {
  // Estados dinámicos conectados a Supabase
  const [alumnosDb, setAlumnosDb] = useState<any[]>([]);
  const [intervencionesDb, setIntervencionesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario
  const [alumnoId, setAlumnoId] = useState("");
  const [tipo, setTipo] = useState("");
  const [fecha, setFecha] = useState(todayStr());
  const [hora, setHora] = useState(nowTime());
  const [profesional, setProfesional] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resultado, setResultado] = useState("");
  const [informo, setInformo] = useState(false);
  const [requiere, setRequiere] = useState(false);
  const [fechaSeg, setFechaSeg] = useState("");

  // Filtros
  const [fAlumno, setFAlumno] = useState("todos");
  const [fTipo, setFTipo] = useState("todos");
  const [fFecha, setFFecha] = useState("");

  // Historial por alumno particular
  const [hAlumno, setHAlumno] = useState("");

  // Modal detalle activo
  const [detalle, setDetalle] = useState<any | null>(null);

  // 1. OBTENER EXPEDIENTES DESDE EL BACKEND
  const sincronizarExpedientes = async () => {
    setLoading(true);
    try {
      // 🎯 Filtro crítico: Solo trae alumnos pertenecientes al Programa PIE
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select("id, nombre, apellido, cursos(numero, letra)")
        .eq("en_pie", true)
        .order("apellido");

      const { data: intervenciones } = await supabase
        .from("intervenciones")
        .select(`
          id, tipo, fecha, hora, profesional, motivo, resultado, 
          informo_apoderado, requiere_seguimiento, fecha_seguimiento, cerrada, creado_at,
          alumno_id, alumnos(nombre, apellido, cursos(numero, letra))
        `)
        .order("creado_at", { ascending: false });

      if (alumnos) setAlumnosDb(alumnos);
      if (intervenciones) setIntervencionesDb(intervenciones);
    } catch (err: any) {
      toast.error("Error al refrescar bitácoras PIE: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sincronizarExpedientes();
  }, []);

  const reset = () => {
    setAlumnoId("");
    setTipo("");
    setFecha(todayStr());
    setHora(nowTime());
    setProfesional("");
    setMotivo("");
    setResultado("");
    setInformo(false);
    setRequiere(false);
    setFechaSeg("");
  };

  // 2. REGISTRAR EXPEDIENTE
  const guardar = async () => {
    if (!alumnoId) return toast.error("Selecciona un alumno");
    if (!tipo) return toast.error("Selecciona el tipo de intervención");
    if (!fecha) return toast.error("Falta la fecha");
    if (!hora) return toast.error("Falta la hora");
    if (!profesional.trim()) return toast.error("Indica el profesional responsable");
    if (!motivo.trim()) return toast.error("Describe el motivo");
    if (!resultado.trim()) return toast.error("Describe el resultado obtenido");
    if (requiere && !fechaSeg) return toast.error("Indica la fecha de próxima revisión");

    try {
      const { error } = await supabase.from("intervenciones").insert({
        alumno_id: alumnoId,
        tipo,
        fecha,
        hora: `${hora}:00`,
        profesional: profesional.trim(),
        motivo: motivo.trim(),
        resultado: resultado.trim(),
        informo_apoderado: informo,
        requiere_seguimiento: requiere,
        // 🎯 CORRECCIÓN: Evita el error de sintaxis usando la variable correcta del formulario
        fecha_seguimiento: requiere && fechaSeg ? fechaSeg : null,
        cerrada: !requiere
      });

      if (error) throw error;

      toast.success("✓ Intervención técnica registrada correctamente.");
      reset();
      sincronizarExpedientes();
    } catch (err: any) {
      toast.error("Error al asentar intervención: " + err.message);
    }
  };

  // 3. RESOLVER O CERRAR SEGUIMIENTOS DESDE EL PANEL
  const ejecutarCierreTecnico = async (id: string) => {
    try {
      const { error } = await supabase
        .from("intervenciones")
        .update({ cerrada: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("✓ Intervención marcada como revisada y cerrada.");
      setDetalle(null);
      sincronizarExpedientes();
    } catch (err: any) {
      toast.error("Error al cerrar expediente: " + err.message);
    }
  };

  // Filtros aplicados reactivamente en el cliente
  const listaFiltrada = useMemo(() => {
    return intervencionesDb
      .filter((i) => (fAlumno === "todos" ? true : i.alumno_id === fAlumno))
      .filter((i) => (fTipo === "todos" ? true : i.tipo === fTipo))
      .filter((i) => (fFecha ? i.fecha === fFecha : true));
  }, [intervencionesDb, fAlumno, fTipo, fFecha]);

  const porAlumnoUnico = useMemo(() => {
    return intervencionesDb.filter((i) => i.alumno_id === hAlumno);
  }, [intervencionesDb, hAlumno]);

  const pendientesAlumno = porAlumnoUnico.filter((i) => i.requiere_seguimiento && !i.cerrada).length;

  // Semáforos de alertas de plazos
  const hoy = todayStr();
  const in3d = new Date();
  in3d.setDate(in3d.getDate() + 3);
  const in3dStr = in3d.toISOString().slice(0, 10);

  const listaSeguimientosPendientes = useMemo(() => {
    return intervencionesDb
      .filter((i) => i.requiere_seguimiento && !i.cerrada && i.fecha_seguimiento)
      .sort((a, b) => (a.fecha_seguimiento ?? "").localeCompare(b.fecha_seguimiento ?? ""));
  }, [intervencionesDb]);

  return (
    <div className="space-y-6 p-4 text-xs">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Módulo Clínico y Pedagógico: Intervenciones PIE</h2>
        <p className="text-sm text-muted-foreground">
          Registro confidencial, planes de apoyo individuales y alarmas de revisiones técnicas semestrales.
        </p>
      </div>

      {/* FORMULARIO */}
      <Card className="p-5 space-y-4 shadow-sm border">
        <div className="flex items-center gap-2 border-b pb-2">
          <ClipboardPlus className="size-4 text-emerald-600" />
          <h3 className="font-bold uppercase tracking-wider text-slate-700 text-xs">Apertura de Ficha de Intervención</h3>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Estudiante PIE *</Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
            >
              <option value="">-- Selecciona un alumno PIE --</option>
              {alumnosDb.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre} ({a.cursos ? `${a.cursos.numero}° ${a.cursos.letra}` : "Sin Curso"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Línea de Intervención *</Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">-- Elige un área --</option>
              {TIPOS_INTERVENCION.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Fecha del Suceso *</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-10 text-xs font-medium" />
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Hora del Bloque *</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-10 text-xs font-medium" />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-semibold text-slate-700">Especialista / Profesional Responsable *</Label>
            <UserSelect
              value={profesional}
              onChange={(n) => setProfesional(n)}
              roles={["encargada", "admin"]}
              placeholder="Escribe o selecciona profesional especialista a cargo..."
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-semibold text-slate-700">Anamnesis / Motivo Detallado *</Label>
            <Textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe detalladamente los objetivos o motivos de la sesión..."
              className="text-xs font-medium text-slate-600"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="font-semibold text-slate-700">Evaluación / Resultado Obtenido *</Label>
            <Textarea
              rows={3}
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              placeholder="Describe el desempeño del alumno, conductas observadas o acuerdos de salida..."
              className="text-xs font-medium text-slate-600"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-slate-50/50 p-3 shadow-sm">
            <div>
              <div className="text-xs font-bold text-slate-700">¿Se informó formalmente al apoderado?</div>
              <div className="text-[10px] text-muted-foreground font-medium">Requiere firma en bitácora física posterior.</div>
            </div>
            <Switch checked={informo} onCheckedChange={setInformo} />
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-slate-50/50 p-3 shadow-sm">
            <div>
              <div className="text-xs font-bold text-slate-700">¿Requiere Seguimiento Clínico?</div>
              <div className="text-[10px] text-muted-foreground font-medium">Agrega una alerta de plazos en el panel.</div>
            </div>
            <Switch checked={requiere} onCheckedChange={setRequiere} />
          </div>

          {requiere && (
            <div className="space-y-1.5 sm:col-span-2 discursive pt-3 border-dashed border-t">
              <Label className="font-bold text-rose-600">Fecha Límite de Próxima Revisión *</Label>
              <Input type="date" value={fechaSeg} onChange={(e) => setFechaSeg(e.target.value)} className="h-10 text-xs font-bold border-rose-200 focus-visible:ring-rose-400 text-rose-700 bg-rose-50/30" />
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={guardar}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 uppercase tracking-wider h-10 text-xs"
          >
            <ClipboardPlus className="size-4" /> Registrar en Carpeta PIE
          </Button>
        </div>
      </Card>

      {/* HISTORIAL GENERAL */}
      <Card className="p-0 overflow-hidden border shadow-sm bg-white">
        <div className="p-4 border-b bg-slate-50/60 flex flex-col lg:flex-row lg:items-end gap-3 justify-between">
          <div>
            <h3 className="font-bold uppercase text-slate-700 text-xs tracking-wide">Fichero Histórico Completo</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Haz clic sobre cualquier registro para abrir la ventana de detalles clínicos.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Estudiante PIE</Label>
              <select
                className="h-9 border rounded-md px-2 bg-background font-medium text-slate-700 focus:outline-none text-xs w-[160px]"
                value={fAlumno}
                onChange={(e) => setFAlumno(e.target.value)}
              >
                <option value="todos">Todos</option>
                {alumnosDb.map((a) => <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Área</Label>
              <select
                className="h-9 border rounded-md px-2 bg-background font-medium text-slate-700 focus:outline-none text-xs w-[180px]"
                value={fTipo}
                onChange={(e) => setFTipo(e.target.value)}
              >
                <option value="todos">Todas las áreas</option>
                {TIPOS_INTERVENCION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-600">Fecha Exacta</Label>
              <Input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} className="h-9 text-xs font-medium w-[140px]" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Estado Técnico</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Motivo / Plan</TableHead>
                <TableHead>Próximo Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 font-semibold animate-pulse">Sincronizando expedientes clínicos...</TableCell></TableRow>
              ) : listaFiltrada.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No se registran hojas de atención para los filtros seleccionados.</TableCell></TableRow>
              ) : (
                listaFiltrada.map((i) => {
                  const alumnoObj = i.alumnos || {};
                  const cursoObj = alumnoObj.cursos || {};
                  return (
                    <TableRow key={i.id} className="cursor-pointer hover:bg-slate-50/60 transition-colors uppercase font-medium text-slate-700 text-[11px]" onClick={() => setDetalle(i)}>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {i.requiere_seguimiento && !i.cerrada ? (
                            <Badge className="bg-amber-600 text-white font-bold text-[9px] px-1.5 py-0.5 tracking-wide">Abierta (Alerta)</Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 tracking-wide">Completada</Badge>
                          )}
                          {i.informo_apoderado && (
                            <Badge className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 tracking-wide">Apoderado OK</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">
                        {alumnoObj.apellido}, {alumnoObj.nombre} <span className="text-[10px] text-muted-foreground font-normal lowercase ml-0.5">({cursoObj.numero}° {cursoObj.letra})</span>
                      </TableCell>
                      <TableCell className="text-slate-500 font-semibold">{i.fecha} • {i.hora ? i.hora.slice(0, 5) : ""}</TableCell>
                      <TableCell className="text-slate-600 font-bold">{i.tipo}</TableCell>
                      <TableCell className="text-slate-500 font-bold text-[10px]">{i.profesional}</TableCell>
                      <TableCell className="text-slate-400 lowercase max-w-[180px] truncate" title={i.motivo}>{i.motivo}</TableCell>
                      <TableCell className="font-bold text-rose-600">{i.requiere_seguimiento && !i.cerrada ? (i.fecha_seguimiento || "Pendiente") : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* HISTORIAL POR ALUMNO DETALLADO */}
      <Card className="p-5 space-y-4 shadow-sm border bg-white">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between border-b pb-2">
          <div>
            <h3 className="font-bold uppercase text-slate-700 text-xs tracking-wide">Expediente Clínico Consolidado</h3>
            <p className="text-[10px] text-muted-foreground font-medium">Historial acumulado integral de un estudiante del programa PIE.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600">Estudiante PIE a Auditar</Label>
            <select
              className="h-9 border rounded-md px-3 bg-background font-medium text-slate-700 focus:outline-none text-xs w-[240px]"
              value={hAlumno}
              onChange={(e) => setHAlumno(e.target.value)}
            >
              <option value="">-- Elegir alumno PIE --</option>
              {alumnosDb.map((a) => <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}</option>)}
            </select>
          </div>
        </div>

        {hAlumno && (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border bg-slate-50/50 p-3 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sesiones Registradas</div>
                <div className="text-xl font-bold text-slate-800 mt-1">{porAlumnoUnico.length}</div>
              </div>
              <div className="rounded-xl border bg-slate-50/50 p-3 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revisiones Pendientes</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{pendientesAlumno}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Especialidad</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porAlumnoUnico.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-4 text-slate-400 font-semibold">El estudiante no registra atenciones por especialistas en el periodo.</TableCell></TableRow>
                  ) : (
                    porAlumnoUnico.map((i) => (
                      <TableRow key={i.id} className="cursor-pointer font-medium uppercase text-[11px]" onClick={() => setDetalle(i)}>
                        <TableCell className="font-bold text-slate-600">{i.fecha} • {i.hora ? i.hora.slice(0, 5) : ""}</TableCell>
                        <TableCell className="font-bold text-slate-700">{i.tipo}</TableCell>
                        <TableCell className="text-slate-500 text-[10px] font-bold">{i.profesional}</TableCell>
                        <TableCell>
                          {i.requiere_seguimiento && !i.cerrada ? (
                            <Badge className="bg-amber-500 text-white font-bold text-[9px]">Pendiente</Badge>
                          ) : (
                            <Badge className="bg-emerald-600 text-white font-bold text-[9px]">Revisada</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      {/* PANEL DE COMPROMISOS */}
      <Card className="p-0 overflow-hidden border shadow-sm bg-white">
        <div className="p-4 border-b bg-rose-50/30 border-rose-100">
          <h3 className="font-bold uppercase text-rose-800 text-xs tracking-wide">Panel de Semáforos y Compromisos Pendientes</h3>
          <p className="text-[10px] text-rose-700 font-medium">Alertas de fiscalización por orden cronológico estricto de vencimiento.</p>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Plazo Límite</TableHead>
                <TableHead>Estudiante</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Profesional Responsable</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Validación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaSeguimientosPendientes.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-6 font-semibold">✓ No existen compromisos o revisiones fuera de plazo en el establecimiento.</TableCell></TableRow>
              ) : (
                listaSeguimientosPendientes.map((i) => {
                  const alObj = i.alumnos || {};
                  const fLimit = i.fecha_seguimiento;
                  const vencida = fLimit < hoy;
                  const proxima = !vencida && fLimit <= in3dStr;
                  return (
                    <TableRow key={i.id} className="text-[11px] font-medium uppercase text-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{fLimit}</span>
                          {vencida && <Badge className="bg-rose-600 text-white font-bold text-[9px]">Plazo Vencido</Badge>}
                          {proxima && <Badge className="bg-amber-500 text-white font-bold text-[9px]">Urgente</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-800">{alObj.apellido}, {alObj.nombre}</TableCell>
                      <TableCell className="font-bold text-slate-600">{i.tipo}</TableCell>
                      <TableCell className="text-slate-500 font-bold text-[10px]">{i.profesional}</TableCell>
                      <TableCell className="text-slate-400 lowercase max-w-[180px] truncate" title={i.motivo}>{i.motivo}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-[9px] gap-1 px-2 h-8"
                          onClick={() => ejecutarCierreTecnico(i.id)}
                        >
                          <CheckCircle2 className="size-3.5" /> Cerrar Expediente
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL VISTA CONFIDENCIAL */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-xl text-xs">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-bold text-slate-800 uppercase tracking-wide">Ficha Técnica Confidencial de Intervención PIE</DialogTitle>
          </DialogHeader>
          
          {detalle && (
            <div className="space-y-4 text-xs font-medium text-slate-700 pt-2">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border">
                <Info label="Estudiante" value={`${detalle.alumnos?.apellido || ""}, ${detalle.alumnos?.nombre || ""}`} />
                <Info label="Curso / Sala" value={detalle.alumnos?.cursos ? `${detalle.alumnos.cursos.numero}° ${detalle.alumnos.cursos.letra}` : "—"} />
                <Info label="Línea Técnica" value={detalle.tipo} />
                <Info label="Fecha y Hora Evento" value={`${detalle.fecha} a las ${detalle.hora ? detalle.hora.slice(0, 5) : ""}`} />
                <Info label="Profesional Evaluador" value={detalle.profesional} />
                <Info label="Apoderado Notificado" value={detalle.informo_apoderado ? "Sí, Registrado en Carpeta" : "No"} />
              </div>
              
              <div className="space-y-3">
                <Info label="Anamnesis u Objetivos de Sesión" value={detalle.motivo} block />
                <Info label="Tratamiento / Resultados de Salida" value={detalle.resultado} block />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-dashed">
                <Info label="Requiere Seguimiento Continuo" value={detalle.requiere_seguimiento ? "Sí, Alerta Activa" : "No, Caso Concluido"} />
                <Info label="Fecha Próxima Fiscalización" value={detalle.fecha_seguimiento || "—"} />
              </div>
            </div>
          )}
          
          <DialogFooter className="border-t pt-3 flex gap-2">
            {detalle && detalle.requiere_seguimiento && !detalle.cerrada && (
              <Button
                onClick={() => ejecutarCierreTecnico(detalle.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wide text-[10px]"
              >
                <CheckCircle2 className="size-4" /> Validar y Concluir Caso
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetalle(null)} className="font-bold text-[10px] uppercase">Cerrar Ventana</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "space-y-1" : "space-y-0.5"}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className={block ? "whitespace-pre-wrap text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50 p-3 rounded-lg border" : "font-bold text-slate-800 uppercase"}>{value}</div>
    </div>
  );
}