import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store";
import { Plus, ThumbsUp, ThumbsDown, Eye, BellRing } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/anotaciones")({
  component: AnotacionesView,
});

const tipos: { v: "positiva" | "negativa" | "observacion"; label: string }[] = [
  { v: "positiva", label: "Positiva" },
  { v: "negativa", label: "Negativa" },
  { v: "observacion", label: "Observación neutral" },
];

const comportamientos = ["Participativo", "Concentrado", "Distraído", "Retraído", "Agresivo", "Colaborador"];

const niveles: { v: string; label: string; cls: string }[] = [
  { v: "normal", label: "Requiere apoyo normal", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  { v: "mas", label: "Requiere más apoyo", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { v: "urgente", label: "Requiere apoyo urgente", cls: "bg-rose-50 text-rose-700 border-rose-200" },
];

const BLOQUES_ESB = [
  "1° Bloque (08:00 - 09:30)",
  "2° Bloque (09:45 - 11:15)",
  "3° Bloque (11:30 - 13:00)",
  "4° Bloque (13:45 - 15:15)",
  "5° Bloque (15:20 - 16:50)"
];

function AnotacionesView() {
  const user = useAuth((s) => s.user);

  // Estados de datos relacionales
  const [alumnosDb, setAlumnosDb] = useState<any[]>([]);
  const [anotacionesDb, setAnotacionesDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del Formulario
  const [form, setForm] = useState({
    alumnoId: "",
    tipo: "" as "" | "positiva" | "negativa" | "observacion",
    bloque: "",
    comportamiento: "",
    nivelApoyo: "",
    avisoApoderado: false,
    descripcion: "",
  });

  // 1. CARGA DE DATOS DESDE SUPABASE
  const cargarDatosSincronizados = async () => {
    setLoading(true);
    try {
      // Cargar alumnos para el selector (Si es profesor, idealmente vería sus cursos, si es admin ve todos)
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select(`id, nombre, apellido, cursos(numero, letra)`)
        .order("apellido");

      // Cargar historial de anotaciones cruzando con el alumno y el autor
      const { data: anotaciones } = await supabase
        .from("anotaciones")
        .select(`
          id, tipo, bloque, comportamiento, nivel_apoyo, aviso_apoderado, descripcion, fecha,
          alumnos(nombre, apellido, cursos(numero, letra)),
          usuarios(nombre, apellido)
        `)
        .order("creado_at", { ascending: false });

      if (alumnos) setAlumnosDb(alumnos);
      if (anotaciones) setAnotacionesDb(anotaciones);
    } catch (err: any) {
      toast.error("Error al sincronizar bitácora: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosSincronizados();
  }, []);

  // 2. ENVIAR ANOTACIÓN REAL A SUPABASE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.alumnoId || !form.tipo || !form.bloque || !form.comportamiento || !form.nivelApoyo) {
      toast.error("Por favor, completa todos los campos requeridos (*).");
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { error } = await supabase.from("anotaciones").insert({
        alumno_id: form.alumnoId,
        autor_id: authUser?.id,
        tipo: form.tipo,
        bloque: form.bloque,
        comportamiento: form.comportamiento,
        nivel_apoyo: form.nivelApoyo,
        aviso_apoderado: form.avisoApoderado,
        descripcion: form.descripcion.trim(),
      });

      if (error) throw error;

      toast.success("✓ Anotación registrada y guardada exitosamente.");
      setForm({ alumnoId: "", tipo: "", bloque: "", comportamiento: "", nivelApoyo: "", avisoApoderado: false, descripcion: "" });
      cargarDatosSincronizados();
    } catch (err: any) {
      toast.error("Error al registrar anotación: " + err.message);
    }
  };

  const styles = {
    positiva: { border: "border-l-emerald-500", icon: ThumbsUp, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    negativa: { border: "border-l-rose-500", icon: ThumbsDown, badge: "bg-rose-50 text-rose-700 border-rose-200" },
    observacion: { border: "border-l-amber-500", icon: Eye, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  } as const;

  return (
    <div className="space-y-6 p-4 text-xs">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">Libro de Anotaciones y Observaciones</h2>
        <p className="text-sm text-muted-foreground">Monitoreo de comportamiento, convivencia escolar y niveles de atención requerida.</p>
      </div>

      {/* FORMULARIO DISPONIBLE PARA ADMIN Y PROFESORES */}
      <Card className="p-5 shadow-sm border">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Alumno/a <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={form.alumnoId}
              onChange={(e) => setForm({ ...form, alumnoId: e.target.value })}
            >
              <option value="">-- Elige un estudiante --</option>
              {alumnosDb.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.apellido}, {a.nombre} ({a.cursos ? `${a.cursos.numero}° ${a.cursos.letra}` : "Sin Curso"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Bloque Horario <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={form.bloque}
              onChange={(e) => setForm({ ...form, bloque: e.target.value })}
            >
              <option value="">-- Seleccionar bloque --</option>
              {BLOQUES_ESB.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Tipo de Hoja <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
            >
              <option value="">-- Seleccionar carácter --</option>
              {tipos.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold text-slate-700">Comportamiento Detectado <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={form.comportamiento}
              onChange={(e) => setForm({ ...form, comportamiento: e.target.value })}
            >
              <option value="">-- Seleccionar conducta --</option>
              {comportamientos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="font-semibold text-slate-700">Nivel de Apoyo / Atención Requerida <span className="text-destructive">*</span></Label>
            <select
              className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700 focus:outline-none"
              value={form.nivelApoyo}
              onChange={(e) => setForm({ ...form, nivelApoyo: e.target.value })}
            >
              <option value="">-- Seleccionar nivel de urgencia --</option>
              {niveles.map((n) => <option key={n.v} value={n.v}>{n.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 lg:col-span-3 py-1">
            <Checkbox 
              id="aviso" 
              checked={form.avisoApoderado} 
              onCheckedChange={(c) => setForm({ ...form, avisoApoderado: !!c })} 
            />
            <Label htmlFor="aviso" className="cursor-pointer font-medium text-slate-600 text-xs">Se notificó formalmente al apoderado de este evento</Label>
          </div>

          <div className="space-y-1.5 lg:col-span-3">
            <Label className="font-semibold text-slate-700">Bitácora / Descripción Detallada</Label>
            <Textarea 
              rows={3} 
              value={form.descripcion} 
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })} 
              placeholder="Describe detalladamente los hechos u observaciones pedagógicas del bloque..." 
              className="text-xs"
            />
          </div>

          <div className="lg:col-span-3 flex justify-end">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 uppercase tracking-wide h-10">
              <Plus className="size-4" /> Registrar en Libro de Clases
            </Button>
          </div>
        </form>
      </Card>

      {/* HISTORIAL GENERAL DE ANOTACIONES */}
      <div className="grid gap-4">
        <h3 className="font-bold text-slate-700 uppercase tracking-wider text-xs border-b pb-1">Historial del Establecimiento</h3>
        
        {loading ? (
          <p className="text-center py-6 animate-pulse">Sincronizando bitácoras disciplinarias...</p>
        ) : anotacionesDb.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No se registran anotaciones en la hoja de vida escolar.</p>
        ) : (
          anotacionesDb.map((o) => {
            const alumnoData = o.alumnos || {};
            const cursoData = alumnoData.cursos || {};
            const autorData = o.usuarios || {};
            const s = styles[o.tipo as keyof typeof styles] || styles.observacion;
            const Icon = s.icon;
            const nivelObj = niveles.find((n) => n.v === o.nivel_apoyo);

            return (
              <Card key={o.id} className={`p-4 border-l-4 ${s.border} shadow-sm bg-white`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full grid place-items-center border ${s.badge}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 uppercase text-xs">
                        {alumnoData.apellido}, {alumnoData.nombre} 
                        <span className="text-[10px] text-muted-foreground font-normal lowercase ml-1">
                          ({cursoData.numero}° {cursoData.letra})
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {o.bloque} • {o.fecha} • Escrito por: <span className="uppercase font-semibold">{autorData.nombre} {autorData.apellido}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${s.badge}`}>
                    {o.tipo}
                  </span>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border text-slate-700 font-bold uppercase tracking-wide">{o.comportamiento}</span>
                    {nivelObj && <span className={`px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${nivelObj.cls}`}>{nivelObj.label}</span>}
                    {o.aviso_apoderado && (
                      <span className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-wide flex items-center gap-1">
                        <BellRing className="size-3" /> Apoderado notificado
                      </span>
                    )}
                  </div>
                  {o.descripcion && <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{o.descripcion}</p>}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}