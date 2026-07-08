import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store";
import { toast } from "sonner";
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
import {
  Bell,
  Check,
  CheckCheck,
  CalendarClock,
  Reply,
  X as XIcon,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/app/alertas")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuth.persist?.hasHydrated()) return;
    const role = useAuth.getState().user?.role;
    if (role !== "profesor") throw redirect({ to: "/app" });
  },
  component: AlertasView,
});

function fmt(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function badgeTipo(t: string) {
  if (t === "Alerta urgente") return "bg-rose-600 text-white font-bold";
  if (t === "Observación general") return "bg-sky-600 text-white font-bold";
  return "bg-amber-500 text-white font-bold";
}

function badgeReunion(e: string) {
  if (e === "Confirmada") return "bg-emerald-600 text-white font-bold";
  if (e === "Cancelada") return "bg-rose-600 text-white font-bold";
  return "bg-amber-500 text-white font-bold";
}

function AlertasView() {
  const user = useAuth((s) => s.user);
  
  const [alertasDb, setAlertasDb] = useState<any[]>([]);
  const [reunionesDb, setReunionesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [respondiendo, setRespondiendo] = useState<any | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [rechazando, setRechazando] = useState<any | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const sincronizarBandejaProfesor = async () => {
    if (!user?.name) return;
    setLoading(true);
    try {
      // 1. Cargar Alertas dirigidas a este profesor específico
      const { data: alertas } = await supabase
        .from("coordinacion_alertas")
        .select("id, alumno_id, profesor_destinatario, tipo, mensaje, estado, fecha, alumnos(nombre, apellido)")
        .eq("profesor_destinatario", user.name)
        .order("fecha", { ascending: false });

      // 2. Cargar Citaciones/Reuniones agendadas con este profesor
      const { data: reuniones } = await supabase
        .from("coordinacion_reuniones")
        .select("*")
        .eq("profesor", user.name)
        .order("fecha_hora", { ascending: true });

      if (alertas) setAlertasDb(alertas);
      if (reuniones) setReunionesDb(reuniones);
    } catch (err: any) {
      toast.error("Error al cargar notificaciones: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sincronizarBandejaProfesor();
  }, [user?.name]);

  const marcarAlertaLeida = async (id: string) => {
    try {
      const { error } = await supabase
        .from("coordinacion_alertas")
        .update({ estado: "Vista" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Alerta marcada como vista");
      sincronizarBandejaProfesor();
    } catch (err: any) {
      toast.error("Error al actualizar estado: " + err.message);
    }
  };

  const enviarRespuesta = async () => {
    if (!respondiendo) return;
    if (!respuesta.trim()) return toast.error("Escribe una respuesta");

    try {
      const { error } = await supabase
        .from("coordinacion_alertas")
        .update({ 
          estado: "Respondida",
          mensaje: `${respondiendo.mensaje}\n\n[Respuesta del Docente]: ${respuesta.trim()}`
        })
        .eq("id", respondiendo.id);

      if (error) throw error;
      toast.success("✓ Respuesta guardada en la bitácora PIE.");
      setRespondiendo(null);
      setRespuesta("");
      sincronizarBandejaProfesor();
    } catch (err: any) {
      toast.error("Error al subir respuesta: " + err.message);
    }
  };

  const actualizarAsistenciaReunion = async (id: string, nuevoEstado: string, motivo: string = "") => {
    try {
      const { error } = await supabase
        .from("coordinacion_reuniones")
        .update({ 
          estado: nuevoEstado,
          motivo: motivo ? `${motivo}` : undefined 
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Citación actualizada a: ${nuevoEstado}`);
      setRechazando(null);
      setMotivoRechazo("");
      sincronizarBandejaProfesor();
    } catch (err: any) {
      toast.error("Error al modificar asistencia: " + err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 text-xs font-medium">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Alertas y Citaciones Recibidas</h2>
          <p className="text-sm text-muted-foreground">
            Instrucciones pedagógicas y convocatorias de Co-Docencia despachadas por el equipo PIE.
          </p>
        </div>
        <Button onClick={sincronizarBandejaProfesor} variant="outline" size="sm" className="h-9 font-bold">
          <RefreshCw className="size-3.5" /> Refrescar
        </Button>
      </div>

      {/* Mis alertas */}
      <Card className="p-5 space-y-3 shadow-sm border bg-white">
        <div className="flex items-center gap-2 border-b pb-2">
          <Bell className="size-4 text-rose-600" />
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Mis Instrucciones de Adecuación</h3>
        </div>
        
        {loading ? (
          <p className="text-center py-4 animate-pulse">Sincronizando canales con PIE...</p>
        ) : alertasDb.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No registras alertas u observaciones vigentes en tu bandeja.
          </p>
        ) : (
          <div className="space-y-3">
            {alertasDb.map((a) => {
              const alObj = a.alumnos || {};
              const esNueva = a.estado === "Enviada";
              return (
                <Card key={a.id} className={`p-4 border border-l-4 shadow-sm transition-all uppercase text-[11px] ${esNueva ? "border-l-rose-600 bg-rose-50/20" : "border-l-slate-300 bg-white"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={badgeTipo(a.tipo)}>{a.tipo}</Badge>
                        {esNueva && <Badge className="bg-rose-600 text-white animate-pulse text-[9px] font-bold">Sin leer</Badge>}
                        <span className="text-[10px] font-bold text-slate-400">{fmt(a.fecha)}</span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-1">Estudiante: {alObj.apellido}, {alObj.nombre}</div>
                    </div>
                    <div className="flex gap-2">
                      {esNueva && (
                        <Button size="sm" variant="outline" className="h-8 font-bold text-[10px]" onClick={() => marcarAlertaLeida(a.id)}>
                          <CheckCheck className="size-3.5" /> Confirmar Lectura
                        </Button>
                      )}
                      <Button size="sm" className="h-8 font-bold text-[10px] bg-slate-800 text-white hover:bg-slate-900" onClick={() => setRespondiendo(a)}>
                        <Reply className="size-3.5" /> Agregar Nota / Responder
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-xs lowercase text-slate-600 font-medium bg-slate-50 p-3 rounded-lg border leading-relaxed select-all" style={{ whiteSpace: 'pre-wrap' }}>{a.mensaje}</p>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Citaciones recibidas */}
      <Card className="p-5 space-y-3 shadow-sm border bg-white">
        <div className="flex items-center gap-2 border-b pb-2">
          <CalendarClock className="size-4 text-amber-600" />
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Convocatorias de Co-Docencia</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Objetivo de Citación</TableHead>
                <TableHead>Horario Convocado</TableHead>
                <TableHead>Estado Acta</TableHead>
                <TableHead className="text-right">Responder Invitación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && reunionesDb.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-400 py-6 font-semibold">
                    No registras convocatorias de reuniones pendientes en tu calendario.
                  </TableCell>
                </TableRow>
              ) : (
                reunionesDb.map((r) => (
                  <TableRow key={r.id} className="uppercase font-medium text-slate-700 text-[11px]">
                    <TableCell className="max-w-[300px]">
                      <div className="font-bold text-slate-900">{r.motivo}</div>
                      {r.mensaje_adicional && (
                        <div className="text-[10px] text-muted-foreground lowercase truncate mt-0.5">{r.mensaje_adicional}</div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-500">{fmt(r.fecha_hora)}</TableCell>
                    <TableCell>
                      <Badge className={badgeReunion(r.estado)}>{r.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.state === "Pendiente" || r.estado === "Pendiente" ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" className="bg-emerald-600 text-white font-bold text-[10px] h-8" onClick={() => actualizarAsistenciaReunion(r.id, "Confirmada")}>
                            <Check className="size-3.5" /> Confirmar
                          </Button>
                          <Button size="sm" variant="outline" className="font-bold text-[10px] h-8 text-rose-600 hover:text-rose-700 border-rose-200" onClick={() => setRechazando(r)}>
                            <XIcon className="size-3.5" /> Rechazar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Respondido</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Dialog Responder */}
      <Dialog open={!!respondiendo} onOpenChange={(o) => !o && setRespondiendo(null)}>
        <DialogContent className="text-xs font-medium">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase text-slate-800">Responder Indicación PIE</DialogTitle>
          </DialogHeader>
          {respondiendo && (
            <div className="space-y-3 pt-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Mensaje Original:</div>
              <p className="p-3 rounded-lg bg-slate-50 border text-slate-600 lowercase" style={{ whiteSpace: 'pre-wrap' }}>{respondiendo.mensaje}</p>
              <div className="space-y-1.5 border-t pt-2">
                <Label className="font-bold text-slate-700">Bitácora / Respuesta del Docente</Label>
                <Textarea rows={4} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Indica observaciones aplicadas en el aula común o justificaciones..." className="text-xs uppercase" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="font-bold uppercase text-[10px]" onClick={() => setRespondiendo(null)}>Cancelar</Button>
            <Button className="bg-slate-800 text-white font-bold uppercase text-[10px]" onClick={enviarRespuesta}>Asentar en Historial</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rechazo */}
      <Dialog open={!!rechazando} onOpenChange={(o) => !o && setRechazando(null)}>
        <DialogContent className="text-xs font-medium">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase text-rose-700">Declinar Convocatoria de Co-Docencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <Label className="font-bold text-slate-700">Motivo de Inasistencia / Justificación <span className="text-rose-600">*</span></Label>
            <Input value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} placeholder="Ej: Topón con consejo general / Licencia médica" className="h-10 text-xs" />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="font-bold uppercase text-[10px]" onClick={() => setRechazando(null)}>Cancelar</Button>
            <Button variant="destructive" className="font-bold uppercase text-[10px]" onClick={() => actualizarAsistenciaReunion(rechazando.id, "Cancelada", motivoRechazo.trim())}>Confirmar Rechazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}