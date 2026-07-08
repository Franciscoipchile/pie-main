import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store";
import { UserSelect } from "@/components/UserSelect";
import { Send, CalendarPlus, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/coordinacion")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = useAuth.getState().user?.role;
    if (role !== "encargada" && role !== "admin") {
      throw redirect({ to: "/app" });
    }
  },
  component: CoordinacionView,
});

const TIPOS_ALERTA = ["Observación general", "Alerta urgente", "Seguimiento pedagógico"];

function fmtFecha(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function badgeTipoCls(t: string) {
  if (t === "Alerta urgente") return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
  if (t === "Observación general") return "bg-sky-50 text-sky-700 border-sky-200 font-bold";
  return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
}

function badgeEstadoReunion(e: string) {
  if (e === "Confirmada") return "bg-emerald-600 text-white font-bold";
  if (e === "Cancelada") return "bg-rose-600 text-white font-bold";
  return "bg-amber-500 text-white font-bold";
}

function CoordinacionView() {
  // Estados dinámicos relacionales
  const [alumnosDb, setAlumnosDb] = useState<any[]>([]);
  const [alertasDb, setAlertasDb] = useState<any[]>([]);
  const [reunionesDb, setReunionesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Alerta form
  const [aAlumno, setAAlumno] = useState("");
  const [aProf, setAProf] = useState("");
  const [aTipo, setATipo] = useState("Observación general");
  const [aMsg, setAMsg] = useState("");

  // Reunion form
  const [rProf, setRProf] = useState("");
  const [rMotivo, setRMotivo] = useState("");
  const [rFecha, setRFecha] = useState("");
  const [rMsg, setRMsg] = useState("");

  // 1. CARGA SINCRO DE DATOS (Filtro estricto de alumnos PIE)
  const cargarModuloCoordinacion = async () => {
    setLoading(true);
    try {
      // Filtrar alumnos únicamente vigentes en PIE
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select("id, nombre, apellido, cursos(numero, letra)")
        .eq("en_pie", true)
        .order("apellido");

      const { data: alertas } = await supabase
        .from("coordinacion_alertas")
        .select("id, alumno_id, profesor_destinatario, tipo, mensaje, estado, fecha, alumnos(nombre, apellido)")
        .order("fecha", { ascending: false });

      const { data: reuniones } = await supabase
        .from("coordinacion_reuniones")
        .select("*")
        .order("fecha_hora", { ascending: true });

      if (alumnos) setAlumnosDb(alumnos);
      if (alertas) setAlertasDb(alertas);
      if (reuniones) setReunionesDb(reuniones);
    } catch (err: any) {
      toast.error("Error al sincronizar bitácora de coordinación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarModuloCoordinacion();
  }, []);

  // 2. ENVIAR ALERTA O CANALIZAR OBSERVACIÓN
  const handleEnviarAlerta = async () => {
    if (!aAlumno || !aProf || !aMsg.trim()) {
      toast.error("Por favor completa el alumno, profesor y el mensaje descriptor.");
      return;
    }

    try {
      const { error } = await supabase.from("coordinacion_alertas").insert({
        alumno_id: aAlumno,
        profesor_destinatario: aProf,
        tipo: aTipo,
        mensaje: aMsg.trim()
      });

      if (error) throw error;

      toast.success("✓ Alerta pedagógica despachada con éxito.");
      setAAlumno("");
      setAProf("");
      setATipo("Observación general");
      setAMsg("");
      cargarModuloCoordinacion();
    } catch (err: any) {
      toast.error("Error al despachar alerta: " + err.message);
    }
  };

  // 3. CAMBIAR ESTADO DE LA ALERTA DESDE LA TABLA
  const cambiarEstadoAlertaDb = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("coordinacion_alertas")
        .update({ estado: nuevoEstado })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Alerta marcada como ${nuevoEstado}`);
      cargarModuloCoordinacion();
    } catch (err: any) {
      toast.error("Error al actualizar estado: " + err.message);
    }
  };

  // 4. SOLICITAR REUNIÓN DE PLANIFICACIÓN
  const handleSolicitarReunion = async () => {
    if (!rProf || !rMotivo.trim() || !rFecha) {
      toast.error("Por favor indica el docente, el motivo legal y la fecha propuesta.");
      return;
    }

    try {
      const { error } = await supabase.from("coordinacion_reuniones").insert({
        profesor: rProf,
        motivo: rMotivo.trim(),
        fecha_hora: rFecha,
        mensaje_adicional: rMsg.trim() || null
      });

      if (error) throw error;

      toast.success("✓ Solicitud de coordinación de co-docencia agendada.");
      setRProf("");
      setRMotivo("");
      setRFecha("");
      setRMsg("");
      cargarModuloCoordinacion();
    } catch (err: any) {
      toast.error("Error al registrar reunión: " + err.message);
    }
  };

  // 5. CAMBIAR ESTADO DE LA REUNIÓN (CONFIRMAR/CANCELAR)
  const cambiarEstadoReunionDb = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("coordinacion_reuniones")
        .update({ estado: nuevoEstado })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Reunión ${nuevoEstado}`);
      cargarModuloCoordinacion();
    } catch (err: any) {
      toast.error("Error al modificar agenda: " + err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 text-xs">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Bitácora de Coordinación de Co-Docencia</h2>
          <p className="text-sm text-muted-foreground">
            Planificación compartida y canales directos de alertas psicopedagógicas con profesores jefes y de asignatura.
          </p>
        </div>
        <Button onClick={cargarModuloCoordinacion} variant="outline" size="sm" className="h-9 font-medium">
          <RefreshCw className="size-3.5" /> Sincronizar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ENVIAR OBSERVACIONES */}
        <Card className="p-5 space-y-4 shadow-sm border bg-white">
          <div className="flex items-center gap-2 border-b pb-2">
            <MessageSquare className="size-4 text-sky-600" />
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Despacho de Observaciones Técnicas</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Alumno/a PIE</Label>
              <select
                className="w-full h-10 border rounded-lg px-3 bg-background font-medium text-slate-700 focus:outline-none text-xs"
                value={aAlumno}
                onChange={(e) => setAAlumno(e.target.value)}
              >
                <option value="">-- Elige un estudiante --</option>
                {alumnosDb.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.apellido}, {a.nombre} ({a.cursos ? `${a.cursos.numero}° ${a.cursos.letra}` : "Sin Curso"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Profesor Destinatario</Label>
              <UserSelect
                value={aProf}
                onChange={(n) => setAProf(n)}
                roles={["profesor"]}
                placeholder="Selecciona profesor de asignatura..."
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="font-semibold text-slate-700">Nivel de Alerta</Label>
              <select
                className="w-full h-10 border rounded-lg px-3 bg-background font-medium text-slate-700 focus:outline-none text-xs"
                value={aTipo}
                onChange={(e) => setATipo(e.target.value)}
              >
                {TIPOS_ALERTA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-semibold text-slate-700">Mensaje / Orientaciones Pedagógicas</Label>
            <Textarea rows={3} value={aMsg} onChange={(e) => setAMsg(e.target.value)} placeholder="Indica adecuaciones curriculares o detalles observados..." className="text-xs" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleEnviarAlerta} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-9">
              <Send className="size-3.5" /> Despachar Canal
            </Button>
          </div>
        </Card>

        {/* AGENDAR REUNIÓN */}
        <Card className="p-5 space-y-4 shadow-sm border bg-white">
          <div className="flex items-center gap-2 border-b pb-2">
            <CalendarPlus className="size-4 text-amber-600" />
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Citar a Horas de Planificación PIE</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Profesor de Aula</Label>
              <UserSelect
                value={rProf}
                onChange={(n) => setRProf(n)}
                roles={["profesor"]}
                placeholder="Docente a citar..."
              />
            </div>
            <div className="space-y-1">
              <Label className="font-semibold text-slate-700">Bloque Cronológico Propuesto</Label>
              <Input type="datetime-local" value={rFecha} onChange={(e) => setRFecha(e.target.value)} className="h-10 text-xs font-medium" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="font-semibold text-slate-700">Objetivo Técnico de la Reunión</Label>
              <Input value={rMotivo} onChange={(e) => setRMotivo(e.target.value)} placeholder="Ej: Planificación Co-Docencia Unidad 2 / Revisión FUDEI" className="h-10 text-xs font-medium" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="font-semibold text-slate-700">Notas Adicionales / Temario</Label>
            <Textarea rows={2} value={rMsg} onChange={(e) => setRMsg(e.target.value)} placeholder="Especificar si requiere traer carpetas o materiales..." className="text-xs" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSolicitarReunion} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-9">
              <CalendarPlus className="size-3.5" /> Enviar Convocatoria
            </Button>
          </div>
        </Card>
      </div>

      {/* TABLA ALERTAS ENVIADAS */}
      <Card className="p-0 overflow-hidden border shadow-sm bg-white">
        <div className="p-4 border-b bg-slate-50/50">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Monitoreo de Alertas Despachadas</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Estudiante PIE</TableHead>
                <TableHead>Profesor Asignado</TableHead>
                <TableHead>Grado Alerta</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Estado Acuse</TableHead>
                <TableHead className="text-right">Modificar Acuse</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 animate-pulse font-medium">Sincronizando canales...</TableCell></TableRow>
              ) : alertasDb.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No se registran alertas o indicaciones en tránsito.</TableCell></TableRow>
              ) : (
                alertasDb.map((a) => {
                  const alumnoObj = a.alumnos || {};
                  return (
                    <TableRow key={a.id} className="uppercase font-medium text-slate-700 text-[11px]">
                      <TableCell className="font-bold text-slate-900">{alumnoObj.apellido ? `${alumnoObj.apellido}, ` : ""}{alumnoObj.nombre || "—"}</TableCell>
                      <TableCell className="font-bold text-slate-600 text-[10px]">{a.profesor_destinatario}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badgeTipoCls(a.tipo)}>{a.tipo}</Badge>
                      </TableCell>
                      <TableCell className="lowercase text-slate-500 max-w-[200px] truncate" title={a.mensaje}>{a.mensaje}</TableCell>
                      <TableCell className="text-[10px] font-semibold text-slate-400">{fmtFecha(a.fecha)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-bold uppercase text-[9px]">{a.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <select
                          className="h-7 border rounded bg-background text-[10px] font-bold focus:outline-none w-28 text-slate-700 text-center"
                          value={a.estado}
                          onChange={(e) => cambiarEstadoAlertaDb(a.id, e.target.value)}
                        >
                          <option value="Enviada">Enviada</option>
                          <option value="Vista">Vista</option>
                          <option value="Respondida">Respondida</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* TABLA REUNIONES */}
      <Card className="p-0 overflow-hidden border shadow-sm bg-white">
        <div className="p-4 border-b bg-slate-50/50">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Registro de Horas Cronológicas y Citaciones de Co-Docencia</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Profesor Aula</TableHead>
                <TableHead>Objetivo Curricular</TableHead>
                <TableHead>Fecha y Hora Citación</TableHead>
                <TableHead>Estado Acta</TableHead>
                <TableHead className="text-right">Confirmación Directa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 animate-pulse font-medium">Sincronizando agenda...</TableCell></TableRow>
              ) : reunionesDb.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No hay solicitudes de planificación citadas en el calendario.</TableCell></TableRow>
              ) : (
                reunionesDb.map((r) => (
                  <TableRow key={r.id} className="uppercase font-medium text-slate-700 text-[11px]">
                    <TableCell className="font-bold text-slate-900">{r.profesor}</TableCell>
                    <TableCell className="max-w-[240px] truncate font-bold text-slate-600 text-[10px]" title={r.motivo}>{r.motivo}</TableCell>
                    <TableCell className="font-semibold text-slate-500">{fmtFecha(r.fecha_hora)}</TableCell>
                    <TableCell>
                      <Badge className={badgeEstadoReunion(r.estado)}>{r.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <select
                        className="h-7 border rounded bg-background text-[10px] font-bold focus:outline-none w-32 text-slate-700 text-center"
                        value={r.estado}
                        onChange={(e) => cambiarEstadoReunionDb(r.id, e.target.value)}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Confirmada">Confirmada</option>
                        <option value="Cancelada">Cancelada</option>
                      </select>
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