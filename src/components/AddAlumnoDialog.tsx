import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store"; 
import { supabase } from "@/lib/supabase"; 
import { toast } from "sonner";

const LETRAS = ["A", "B", "C", "D"];

const TIPOS_NEE = [
  { value: "regular", label: "Ninguno — Alumno Regular (No PIE)" },
  { value: "TEL", label: "TEL (Trastorno Específico del Lenguaje)" },
  { value: "TDAH", label: "TDAH (Trastorno por Déficit de Atención e Hiperactividad)" },
  { value: "DEA", label: "DEA (Dificultades Específicas de Aprendizaje)" },
  { value: "TEA", label: "TEA (Trastorno del Espectro Autista)" },
  { value: "Discapacidad intelectual", label: "Discapacidad intelectual" },
  { value: "Discapacidad visual", label: "Discapacidad visual" },
  { value: "Discapacidad auditiva", label: "Discapacidad auditiva" },
  { value: "Discapacidad motora", label: "Discapacidad motora" },
];

interface FormState {
  nombre: string;
  apellidos: string;
  rut: string;
  nivel: "basica" | "media";
  cursoNumero: string;
  letra: string;
  nee: string;
  profesional: string;
  apoderado: string;
  telefonoApoderado: string;
  fechaIngreso: Date | undefined;
  observacionInicial: string;
}

export function AddAlumnoDialog() {
  const [open, setOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const [profesionalesPie, setProfesionalesPie] = useState<any[]>([]);

  const initialForm: FormState = {
    nombre: "",
    apellidos: "",
    rut: "",
    nivel: "basica", 
    cursoNumero: "",
    letra: "",
    nee: "regular", 
    profesional: "",
    apoderado: "",
    telefonoApoderado: "",
    fechaIngreso: undefined,
    observacionInicial: "",
  };

  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    const cargarProfesionales = async () => {
      try {
        // Adaptación: Buscamos tanto 'profesora_pie' como 'profesora_pie' tradicional en minúsculas
        const { data: profs } = await supabase
          .from("usuarios")
          .select("id, nombre, apellido")
          .in("rol", ["profesora_pie", "profesor_pie", "encargada"]);
        if (profs) setProfesionalesPie(profs);
      } catch (err) {
        console.error("Error cargando equipo PIE:", err);
      }
    };
    if (open) cargarProfesionales();
  }, [open]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.apellidos || !form.rut || !form.cursoNumero || !form.letra) {
      toast.error("Por favor, completa todos los datos obligatorios.");
      return;
    }

    try {
      // 1. Validar la existencia física de la sección académica
      const { data: cursoReal, error: errCurso } = await supabase
        .from("cursos")
        .select("id")
        .eq("nivel", form.nivel)
        .eq("numero", parseInt(form.cursoNumero, 10))
        .eq("letra", form.letra)
        .maybeSingle();

      if (errCurso || !cursoReal) {
        toast.error("El curso/nivel seleccionado no está registrado en el sistema administrativo.");
        return;
      }

      const esPie = form.nee !== "regular";

      // 2. Mapeo e Inserción limpia respetando las columnas en snake_case
      const { error } = await supabase.from("alumnos").insert({
        nombre: form.nombre.trim(),
        apellido: form.apellidos.trim(),
        rut: form.rut.trim(),
        curso_id: cursoReal.id, 
        en_pie: esPie,
        tipo_nee: esPie ? form.nee : null,
        profesional_pie_id: esPie && form.profesional ? form.profesional : null,
        nombre_apoderado: esPie && form.apoderado ? form.apoderado.trim() : null,
        telefono_apoderado: esPie && form.telefonoApoderado ? form.telefonoApoderado.trim() : null,
        fecha_ingreso_pie: esPie && form.fechaIngreso ? form.fechaIngreso.toISOString() : null,
        observacion_inicial: esPie && form.observacionInicial ? form.observacionInicial.trim() : null
      });

      if (error) {
        toast.error("Error al registrar en Supabase: " + error.message);
      } else {
        toast.success(esPie ? "✓ Alumno ingresado al Programa PIE de forma exitosa." : "✓ Alumno matriculado con éxito.");
        setForm(initialForm);
        setOpen(false);
        
        // Retardo controlado para que el Toast se alcance a leer antes de refrescar la nómina
        setTimeout(() => {
          window.location.reload(); 
        }, 800);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error imprevisto en el proceso: " + err.message);
    }
  };

  if (user?.role === "profesor") return null;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
        <Plus className="size-4" />
        Agregar alumno
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Agregar alumno al establecimiento</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Nombre"
                  value={form.nombre}
                  onChange={(e) => update("nombre", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  placeholder="Apellidos"
                  value={form.apellidos}
                  onChange={(e) => update("apellidos", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                placeholder="12.345.678-9"
                value={form.rut}
                onChange={(e) => update("rut", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Nivel Educativo</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { update("nivel", "basica"); update("cursoNumero", ""); }}
                  className={cn(
                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors",
                    form.nivel === "basica"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-muted-foreground hover:border-emerald-300"
                  )}
                >
                  Enseñanza Básica
                </button>
                <button
                  type="button"
                  onClick={() => { update("nivel", "media"); update("cursoNumero", ""); }}
                  className={cn(
                    "flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-colors",
                    form.nivel === "media"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-muted-foreground hover:border-emerald-300"
                  )}
                >
                  Enseñanza Media
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cursoNumero">Curso</Label>
                <select
                  id="cursoNumero"
                  className="w-full h-10 border rounded-lg px-3 bg-background text-xs border-input font-medium text-slate-700"
                  value={form.cursoNumero}
                  onChange={(e) => update("cursoNumero", e.target.value)}
                  required
                >
                  <option value="">Seleccionar curso</option>
                  {form.nivel === "basica"
                    ? [1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n.toString()}>{n}° Básico</option>)
                    : [1, 2, 3, 4].map((n) => <option key={n} value={n.toString()}>{n}° Medio</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="letra">Letra / Sección</Label>
                <select
                  id="letra"
                  className="w-full h-10 border rounded-lg px-3 bg-background text-xs border-input font-medium text-slate-700"
                  value={form.letra}
                  onChange={(e) => update("letra", e.target.value)}
                  required
                >
                  <option value="">Letra</option>
                  {LETRAS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nee">Tipo de NEE / Clasificación</Label>
              <select
                id="nee"
                className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700"
                value={form.nee}
                onChange={(e) => update("nee", e.target.value)}
              >
                {TIPOS_NEE.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {form.nee !== "regular" && (
              <div className="space-y-4 pt-3 border-t border-dashed animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label htmlFor="profesional">Profesional PIE a cargo</Label>
                  <select
                    id="profesional"
                    className="w-full h-10 border rounded-lg px-3 bg-background text-xs font-medium text-slate-700"
                    value={form.profesional}
                    onChange={(e) => update("profesional", e.target.value)}
                    required={form.nee !== "regular"}
                  >
                    <option value="">Selecciona profesional PIE</option>
                    {profesionalesPie.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apoderado">Nombre del apoderado</Label>
                    <Input
                      id="apoderado"
                      placeholder="Nombre completo"
                      value={form.apoderado}
                      onChange={(e) => update("apoderado", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefonoApoderado">Teléfono apoderado</Label>
                    <Input
                      id="telefonoApoderado"
                      placeholder="+56 9 ..."
                      value={form.telefonoApoderado}
                      onChange={(e) => update("telefonoApoderado", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaIngreso">Fecha de ingreso al PIE</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="fechaIngreso"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs h-10",
                          !form.fechaIngreso && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {form.fechaIngreso
                          ? format(form.fechaIngreso, "PPP", { locale: es })
                          : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.fechaIngreso}
                        onSelect={(d) => update("fechaIngreso", d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacionInicial">Observación inicial</Label>
                  <Textarea
                    id="observacionInicial"
                    placeholder="Detalles del diagnóstico o adecuaciones"
                    value={form.observacionInicial}
                    onChange={(e) => update("observacionInicial", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Guardar alumno
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}