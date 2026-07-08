import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useData, useAuth, canEdit, logAction } from "@/store";
import { FileDown, CalendarPlus, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/informes")({
  component: InformesView,
});

const tiposInforme = [
  { v: "notas", label: "Informe de notas del alumno" },
  { v: "asistencia", label: "Informe de asistencia" },
  { v: "comportamiento", label: "Informe de comportamiento y anotaciones" },
  { v: "completo", label: "Informe completo para el apoderado" },
];

const periodos = [
  { v: "s1", label: "Semestre 1" },
  { v: "s2", label: "Semestre 2" },
  { v: "anual", label: "Año completo" },
];

const motivosApoderado = ["Seguimiento general", "Entrega de informe", "Conducta observada", "Resultados académicos"];
const motivosProfesor = ["Informar situación del alumno", "Coordinar estrategias de apoyo", "Seguimiento conjunto"];
const motivosProfesional = ["Coordinación interna", "Revisión de caso", "Plan de trabajo"];

function InformesView() {
  const { alumnos, notas, asistencia, observaciones, citaciones, addCitacion } = useData();
  const role = useAuth((s) => s.user?.role);
  const editable = canEdit(role);

  const [informe, setInforme] = useState({ alumnoId: "", tipo: "", periodo: "" });
  const [preview, setPreview] = useState(false);

  const [cita, setCita] = useState({
    alumnoId: "",
    dirigidoA: "" as "" | "apoderado" | "profesor" | "profesional",
    destinatario: "",
    asignatura: "",
    motivo: "",
    fecha: "",
    observaciones: "",
  });

  const alumnoInforme = alumnos.find((a) => a.id === informe.alumnoId);
  const alumnoCita = alumnos.find((a) => a.id === cita.alumnoId);

  // Autocompletar apoderado al seleccionar alumno
  const handleAlumnoCita = (id: string) => {
    const al = alumnos.find((a) => a.id === id);
    setCita((c) => ({
      ...c,
      alumnoId: id,
      destinatario: c.dirigidoA === "apoderado" ? al?.apoderado ?? "" : c.destinatario,
    }));
  };

  const handleDirigidoA = (v: "apoderado" | "profesor" | "profesional") => {
    setCita((c) => ({
      ...c,
      dirigidoA: v,
      destinatario: v === "apoderado" ? alumnoCita?.apoderado ?? "" : "",
      asignatura: v === "profesor" ? c.asignatura : "",
      motivo: "",
    }));
  };

  const motivos = cita.dirigidoA === "apoderado" ? motivosApoderado : cita.dirigidoA === "profesor" ? motivosProfesor : motivosProfesional;

  const tipoLabel = useMemo(() => tiposInforme.find((t) => t.v === informe.tipo)?.label ?? "", [informe.tipo]);
  const periodoLabel = useMemo(() => periodos.find((p) => p.v === informe.periodo)?.label ?? "", [informe.periodo]);

  const generar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!informe.alumnoId || !informe.tipo || !informe.periodo) { toast.error("Completa los campos"); return; }
    setPreview(true);
    const al = alumnos.find((a) => a.id === informe.alumnoId);
    logAction({
      accion: "Informe generado",
      modulo: "Informes",
      tipo: "creacion",
      detalle: `${al?.nombre ?? "—"} · ${tipoLabel} · ${periodoLabel}`,
    });
  };

  const citar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cita.alumnoId || !cita.dirigidoA || !cita.destinatario || !cita.motivo || !cita.fecha) {
      toast.error("Completa los campos requeridos");
      return;
    }
    addCitacion({
      alumnoId: cita.alumnoId,
      motivo: cita.motivo,
      fecha: cita.fecha,
      observaciones: cita.observaciones,
      estado: "pendiente",
      dirigidoA: cita.dirigidoA,
      destinatario: cita.destinatario,
      asignatura: cita.dirigidoA === "profesor" ? cita.asignatura : undefined,
    });
    setCita({ alumnoId: "", dirigidoA: "", destinatario: "", asignatura: "", motivo: "", fecha: "", observaciones: "" });
    toast.success("Citación creada");
  };

  // Datos para el preview
  const previewData = useMemo(() => {
    if (!alumnoInforme) return null;
    const ns = notas.filter((n) => n.alumnoId === alumnoInforme.id);
    const as = asistencia.filter((a) => a.alumnoId === alumnoInforme.id);
    const obs = observaciones.filter((o) => o.alumnoId === alumnoInforme.id);
    const prom = ns.length ? ns.reduce((a, n) => a + n.nota, 0) / ns.length : 0;
    return { ns, as, obs, prom };
  }, [alumnoInforme, notas, asistencia, observaciones]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Informes y citaciones</h2>
        <p className="text-sm text-muted-foreground">Genera informes y registra citaciones a apoderados, profesores y profesionales.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FileDown className="size-4 text-primary" /> Generar informe</h3>
          <form onSubmit={generar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Alumno</Label>
              <Select value={informe.alumnoId} onValueChange={(v) => setInforme({ ...informe, alumnoId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{alumnos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de informe</Label>
              <Select value={informe.tipo} onValueChange={(v) => setInforme({ ...informe, tipo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{tiposInforme.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={informe.periodo} onValueChange={(v) => setInforme({ ...informe, periodo: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{periodos.map((p) => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!editable} className="w-full"><FileDown className="size-4" /> Generar informe</Button>
          </form>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><CalendarPlus className="size-4 text-primary" /> Nueva citación</h3>
          <form onSubmit={citar} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Alumno</Label>
              <Select value={cita.alumnoId} onValueChange={handleAlumnoCita}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{alumnos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dirigida a</Label>
              <Select value={cita.dirigidoA} onValueChange={(v) => handleDirigidoA(v as "apoderado" | "profesor" | "profesional")}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apoderado">Apoderado</SelectItem>
                  <SelectItem value="profesor">Profesor</SelectItem>
                  <SelectItem value="profesional">Profesional PIE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cita.dirigidoA && (
              <div className="space-y-1.5">
                <Label>
                  {cita.dirigidoA === "apoderado" ? "Nombre del apoderado" : cita.dirigidoA === "profesor" ? "Nombre del profesor" : "Nombre del profesional"}
                </Label>
                <Input
                  value={cita.destinatario}
                  onChange={(e) => setCita({ ...cita, destinatario: e.target.value })}
                  placeholder={cita.dirigidoA === "apoderado" ? "Se autocompleta desde la ficha" : "Nombre completo"}
                />
              </div>
            )}

            {cita.dirigidoA === "profesor" && (
              <div className="space-y-1.5">
                <Label>Asignatura</Label>
                <Input value={cita.asignatura} onChange={(e) => setCita({ ...cita, asignatura: e.target.value })} placeholder="Ej: Matemática" />
              </div>
            )}

            {cita.dirigidoA && (
              <div className="space-y-1.5">
                <Label>Motivo</Label>
                <Select value={cita.motivo} onValueChange={(v) => setCita({ ...cita, motivo: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                  <SelectContent>{motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={cita.fecha} onChange={(e) => setCita({ ...cita, fecha: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones adicionales</Label>
              <Textarea rows={2} value={cita.observaciones} onChange={(e) => setCita({ ...cita, observaciones: e.target.value })} />
            </div>
            <Button type="submit" disabled={!editable} className="w-full"><CalendarPlus className="size-4" /> Crear citación</Button>
          </form>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Citaciones pendientes</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumno</TableHead>
                <TableHead>Dirigida a</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {citaciones.map((c) => {
                const al = alumnos.find((a) => a.id === c.alumnoId);
                const cls =
                  c.estado === "pendiente" ? "bg-warning/20 text-warning-foreground" :
                  c.estado === "realizada" ? "bg-success/15 text-success" :
                  "bg-muted text-muted-foreground";
                const dirigidoLabel = c.dirigidoA
                  ? `${c.dirigidoA[0].toUpperCase()}${c.dirigidoA.slice(1)}${c.destinatario ? ` · ${c.destinatario}` : ""}${c.asignatura ? ` (${c.asignatura})` : ""}`
                  : "—";
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{al?.nombre ?? "—"}</TableCell>
                    <TableCell className="text-sm">{dirigidoLabel}</TableCell>
                    <TableCell>{c.motivo}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.fecha}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${cls}`}>{c.estado}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {citaciones.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin citaciones registradas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Vista previa de informe</DialogTitle>
          </DialogHeader>
          {alumnoInforme && previewData && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border p-4 bg-primary-soft/30">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Tipo</div>
                <div className="font-semibold">{tipoLabel}</div>
                <div className="text-xs text-muted-foreground mt-2">Período: <span className="font-medium text-foreground">{periodoLabel}</span></div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Alumno</div>
                  <div className="font-medium">{alumnoInforme.nombre}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Curso · NEE</div>
                  <div className="font-medium">{alumnoInforme.curso} · {alumnoInforme.nee}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Apoderado</div>
                  <div className="font-medium">{alumnoInforme.apoderado ?? "—"}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs text-muted-foreground">Profesional PIE</div>
                  <div className="font-medium">{alumnoInforme.profesional}</div>
                </div>
              </div>

              {(informe.tipo === "notas" || informe.tipo === "completo") && (
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">Notas</div>
                    <Badge variant="outline">Promedio {previewData.prom.toFixed(2)}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{previewData.ns.length} evaluación(es) registradas.</div>
                </div>
              )}
              {(informe.tipo === "asistencia" || informe.tipo === "completo") && (
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold text-sm">Asistencia</div>
                  <div className="text-sm text-muted-foreground">{previewData.as.length} registro(s) de asistencia.</div>
                </div>
              )}
              {(informe.tipo === "comportamiento" || informe.tipo === "completo") && (
                <div className="rounded-lg border border-border p-4">
                  <div className="font-semibold text-sm">Comportamiento y anotaciones</div>
                  <div className="text-sm text-muted-foreground">{previewData.obs.length} anotación(es) registradas.</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(false)}>Cerrar</Button>
            <Button onClick={() => { toast.success("Informe generado"); setPreview(false); }}>
              <FileDown className="size-4" /> Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
