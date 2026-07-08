import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, RefreshCw, ShieldCheck, User, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils"; // 1. Corregido: Importación de cn añadida

export const Route = createFileRoute("/app/log")({
  beforeLoad: async () => {
    // 2. Corregido: Validación de sesión y rol usando redirección nativa segura
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    
    const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).maybeSingle();
    if (perfil?.rol !== "administrador") {
      window.location.href = "/app";
      return;
    }
  },
  component: PanelAuditoriaLogsView,
});

function PanelAuditoriaLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerBitacoraLogs();
  }, []);

  async function obtenerBitacoraLogs() {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error al leer la bitácora:", err);
    } finally {
      // Corregido: Se eliminó la línea de setCargandoAlumnos
      setCargando(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-sm">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="size-6 text-slate-700" /> Historial de Auditoría (Logs)
          </h2>
          <p className="text-slate-500 mt-1">
            Registro cronológico oficial e inmutable de las operaciones críticas efectuadas en el libro digital.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={obtenerBitacoraLogs} 
          disabled={cargando}
          className="text-xs font-semibold uppercase tracking-wider text-slate-700"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${cargando ? "animate-spin" : ""}`} />
          {cargando ? "Actualizando..." : "Refrescar Bitácora"}
        </Button>
      </div>

      <Card className="p-6 bg-white border shadow-sm">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-medium text-sm space-y-2">
            <Loader2 className="size-5 text-blue-600 animate-spin" />
            <p>Sincronizando registros con Supabase...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 border border-dashed rounded-xl">
            <ClipboardList className="size-12 text-slate-300 mb-2" />
            <p className="font-medium">No se registran movimientos críticos en la bitácora todavía.</p>
            <p className="text-xs text-slate-400 mt-0.5">Las acciones de asistencia y calificaciones se verán reflejadas aquí automáticamente.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase w-48 pl-4">Fecha / Hora</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase w-40">Módulo</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase w-52">Usuario Responsable</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase">Descripción del Evento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-slate-500 font-medium text-xs pl-4 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-slate-400" />
                        {new Date(log.created_at).toLocaleString("es-CL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {/* 3. Corregido: variant="flat" cambiado por variant="outline" con estilos Tailwind manuales limpios */}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider h-5 px-2 rounded-md border shadow-none",
                          log.accion === "ASISTENCIA" 
                            ? "bg-blue-50 text-blue-700 border-blue-200" 
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        {log.accion}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-xs uppercase">
                      <span className="flex items-center gap-1.5">
                        <User className="size-3.5 text-slate-400" />
                        {log.usuario_nombre || "Sistema"}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium text-xs">
                      {log.detalles}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}