import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store";
import { getCursosProfesor, normalizeCurso } from "@/lib/profesor-utils";
import { toast } from "sonner";
import { Send, MessageSquare, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/app/comunicacion")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuth.persist?.hasHydrated()) return;
    const role = useAuth.getState().user?.role;
    if (role !== "profesor") throw redirect({ to: "/app" });
  },
  component: ComunicacionView,
});

function fmt(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function badgeEstado(e: string) {
  if (e === "Respondido") return "bg-emerald-600 text-white font-bold";
  if (e === "Leído") return "bg-blue-500 text-white font-bold";
  return "bg-amber-500 text-white font-bold";
}

function ComunicacionView() {
  const user = useAuth((s) => s.user);
  
  const [alumnosDb, setAlumnosDb] = useState<any[]>([]);
  const [mensajesDb, setMensajesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [asunto, setAsunto] = useState("Consulta sobre alumno");
  const [alumnoId, setAlumnoId] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Calcular de forma segura las mallas del profesor logueado
  const cursosProf = useMemo(() => getCursosProfesor(user).map(normalizeCurso), [user]);

  // Sincronizar nóminas y casillero de mensajes
  const cargarCasilleroMensajes = async () => {
    if (!user?.name) return;
    setLoading(true);
    try {
      // Traer alumnos
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select("id, nombre, apellido, curso_id, cursos(numero, letra, nivel)")
        .order("apellido");

      // Traer mensajes enviados por este docente
      const { data: mensajes } = await supabase
        .from("profesor_mensajes")
        .select("id, asunto, alumno_id, mensaje, estado, fecha, alumnos(nombre, apellido)")
        .eq("profesor_username", user.name)
        .order("fecha", { ascending: false });

      if (alumnos) setAlumnosDb(alumnos);
      if (mensajes) setMensajesDb(mensajes);
    } catch (err: any) {
      toast.error("Error al refrescar casillero: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCasilleroMensajes();
  }, [user?.name]);

  // Filtrar en memoria para desplegar solo alumnos PIE que correspondan a las salas del profesor
  const alumnosFiltradosVisibles = useMemo(() => {
    return alumnosDb.filter((a) => {
      if (!a.cursos) return false;
      const codCurso = normalizeCurso(`${a.cursos.numero}${a.cursos.letra}`);
      return cursosProf.includes(codCurso);
    });
  }, [alumnosDb, cursosProf]);

  const handleEnviar = async () => {
    if (!mensaje.trim()) return toast.error("Escribe un mensaje");

    try {
      const { error } = await supabase.from("profesor_mensajes").insert({
        profesor_username: user?.name || "anonimo",
        asunto,
        alumno_id: alumnoId || null,
        mensaje: mensaje.trim()
      });

      if (error) throw error;

      toast.success("✓ Mensaje canalizado al Departamento PIE.");
      setAsunto("Consulta sobre alumno");
      setAlumnoId("");
      setMensaje("");
      cargarCasilleroMensajes();
    } catch (err: any) {
      toast.error("Error al despachar mensaje: " + err.message);
    }
  };

  return (
    <div className="space-y-6 p-4 text-xs font-medium">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Comunicación Exclusiva con Departamento PIE</h2>
          <p className="text-sm text-muted-foreground">
            Despacha consultas directas, reportes conductuales o solicitudes de evaluaciones especiales.
          </p>
        </div>
        <Button onClick={cargarCasilleroMensajes} variant="outline" size="sm" className="h-9 font-bold">
          <RefreshCw className="size-3.5" /> Refrescar
        </Button>
      </div>

      <Card className="p-5 space-y-4 shadow-sm border bg-white">
        <div className="flex items-center gap-2 border-b pb-2">
          <MessageSquare className="size-4 text-emerald-600" />
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Apertura de Consulta Externa</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Asunto Técnico *</Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
            >
              <option value="Consulta sobre alumno">Consulta sobre alumno</option>
              <option value="Reporte de Adecuación Curricular">Reporte de Adecuación Curricular</option>
              <option value="Solicitud de Evaluación Especialista">Solicitud de Evaluación Especialista</option>
              <option value="Otros Asuntos Coordinación">Otros Asuntos Coordinación</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Estudiante Relacionado (Opcional)</Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none uppercase"
              value={alumnoId}
              onChange={(e) => setAlumnoId(e.target.value)}
            >
              <option value="">-- Sin estudiante específico --</option>
              {alumnosFiltradosVisibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre} ({a.cursos ? `${a.cursos.numero}° ${a.cursos.letra}` : ""})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Label className="font-semibold text-slate-700">Mensaje Descriptor *</Label>
          <Textarea
            rows={4}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe tu mensaje o inquietud detallada a la Coordinadora PIE..."
            className="text-xs font-medium text-slate-600"
          />
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleEnviar} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-10">
            <Send className="size-4" /> Despachar Mensaje
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3 shadow-sm border bg-white">
        <div className="border-b pb-2">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs">Casillero de Mensajes Despachados</h3>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 uppercase text-[10px] font-bold">
              <TableRow>
                <TableHead>Fecha Despacho</TableHead>
                <TableHead>Asunto Referido</TableHead>
                <TableHead>Estudiante Relacionado</TableHead>
                <TableHead>Cuerpo del Mensaje</TableHead>
                <TableHead>Estado Lectura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 animate-pulse">Cargando correspondencia...</TableCell></TableRow>
              ) : mensajesDb.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-6 font-semibold">
                    No registras correspondencia despachada en tu casillero histórico.
                  </TableCell>
                </TableRow>
              ) : (
                mensajesDb.map((m) => {
                  const al = m.alumnos || {};
                  return (
                    <TableRow key={m.id} className="uppercase font-medium text-slate-700 text-[11px]">
                      <TableCell className="text-[10px] font-semibold text-slate-400">{fmt(m.fecha)}</TableCell>
                      <TableCell className="font-bold text-slate-800 text-[10px]">{m.asunto}</TableCell>
                      <TableCell className="text-slate-500 font-bold">
                        {al.apellido ? `${al.apellido}, ${al.nombre}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[320px] truncate lowercase font-medium text-slate-400" title={m.mensaje}>
                        {m.mensaje}
                      </TableCell>
                      <TableCell>
                        <Badge className={badgeEstado(m.estado)}>{m.estado}</Badge>
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
  );
}