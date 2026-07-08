import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/store";
import { NeeBadge } from "@/components/NeeBadge";
import { ArrowLeft, GraduationCap, IdCard, Calendar, UserCog, User, Phone, Stethoscope } from "lucide-react";
import type { Alumno } from "@/lib/mock-data";

export const Route = createFileRoute("/app/alumnos/$id")({
  component: AlumnoFicha,
});

function formatCurso(a: Alumno): string {
  const match = a.curso.match(/^(\d+°)([A-D])$/);
  if (match) {
    const nivel = a.nivel === "media" || a.curso.toLowerCase().includes("medio") ? "Medio" : "Básico";
    return `${match[1]} ${nivel} ${match[2]}`;
  }
  return a.curso;
}

function getNivel(a: Alumno): "basica" | "media" {
  if (a.nivel) return a.nivel;
  if (a.curso.toLowerCase().includes("medio")) return "media";
  return "basica";
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        <Icon className="size-4 text-primary" /> {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5">{value || "—"}</div>
    </div>
  );
}

function AlumnoFicha() {
  const { id } = Route.useParams();
  const { alumnos, observaciones, notas, resoluciones } = useData();
  const alumno = alumnos.find((a) => a.id === id);
  if (!alumno) throw notFound();

  const obs = observaciones.filter((o) => o.alumnoId === id);
  const ns = notas.filter((n) => n.alumnoId === id);
  const res = resoluciones.filter((r) => r.alumnoId === id);
  const nivel = getNivel(alumno);

  const promedio = useMemo(
    () => (ns.length ? ns.reduce((a, n) => a + n.nota, 0) / ns.length : 0),
    [ns],
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/alumnos"><ArrowLeft className="size-4" /> Volver al listado</Link>
      </Button>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-16 rounded-2xl bg-primary-soft text-primary grid place-items-center text-xl font-semibold">
              {alumno.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{alumno.nombre}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={
                    nivel === "basica"
                      ? "bg-blue-50 text-blue-700 border-blue-300 font-medium"
                      : "bg-purple-50 text-purple-700 border-purple-300 font-medium"
                  }
                >
                  {nivel === "basica" ? "Enseñanza Básica" : "Enseñanza Media"}
                </Badge>
                <NeeBadge type={alumno.nee} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <Section title="Datos del alumno" icon={User}>
          <Field label="Nombre completo" value={alumno.nombre} />
          <Field label="RUT" value={<span className="flex items-center gap-1"><IdCard className="size-3.5 text-muted-foreground" /> {alumno.rut || "—"}</span>} />
          <Field label="Curso" value={<span className="flex items-center gap-1"><GraduationCap className="size-3.5 text-muted-foreground" /> {formatCurso(alumno)}</span>} />
          <Field
            label="Nivel"
            value={
              <Badge
                variant="outline"
                className={
                  nivel === "basica"
                    ? "bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-purple-50 text-purple-700 border-purple-300"
                }
              >
                {nivel === "basica" ? "Básica" : "Media"}
              </Badge>
            }
          />
        </Section>

        <Section title="Información PIE" icon={Stethoscope}>
          <Field label="Tipo de NEE / diagnóstico" value={<NeeBadge type={alumno.nee} />} />
          <Field label="Profesional PIE a cargo" value={<span className="flex items-center gap-1"><UserCog className="size-3.5 text-muted-foreground" /> {alumno.profesional}</span>} />
          <Field label="Fecha de ingreso al PIE" value={<span className="flex items-center gap-1"><Calendar className="size-3.5 text-muted-foreground" /> {alumno.fechaIngreso}</span>} />
          <Field label="Observación inicial" value={alumno.observacionInicial || "—"} />
        </Section>

        <Section title="Contacto apoderado" icon={Phone}>
          <Field label="Nombre del apoderado" value={alumno.apoderado} />
          <Field label="Teléfono" value={alumno.telefonoApoderado} />
        </Section>
      </Card>

      <Tabs defaultValue="obs">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto">
          <TabsTrigger value="obs">Observaciones</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="anot">Anotaciones</TabsTrigger>
          <TabsTrigger value="res">Resolución PIE</TabsTrigger>
        </TabsList>

        <TabsContent value="obs" className="mt-4 space-y-3">
          {obs.length === 0 && <Card className="p-6 text-center text-muted-foreground">Sin observaciones registradas.</Card>}
          {obs.map((o) => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline">{o.bloque}</Badge>
                <span className="text-xs text-muted-foreground">{o.fecha}</span>
              </div>
              <div className="font-medium">{o.comportamiento}</div>
              <p className="text-sm text-muted-foreground">{o.descripcion}</p>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notas" className="mt-4 space-y-2">
          {ns.length === 0 && <Card className="p-6 text-center text-muted-foreground">Sin notas registradas.</Card>}
          {ns.length > 0 && (
            <Card className="p-4 flex items-center justify-between bg-primary-soft/40">
              <div className="font-medium">Promedio general</div>
              <span className={`text-2xl font-bold ${promedio >= 4 ? "text-success" : "text-destructive"}`}>{promedio.toFixed(2)}</span>
            </Card>
          )}
          {ns.map((n) => (
            <Card key={n.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{n.asignatura}</div>
                <div className="text-xs text-muted-foreground">{n.tipoEvaluacion} · {n.fecha}{n.semestre ? ` · Sem. ${n.semestre}` : ""}</div>
              </div>
              <div className={`text-2xl font-semibold ${n.nota >= 4 ? "text-success" : "text-destructive"}`}>{n.nota.toFixed(1)}</div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="anot" className="mt-4 space-y-2">
          {obs.filter((o) => o.tipo !== "observacion").length === 0 && (
            <Card className="p-6 text-center text-muted-foreground">Sin anotaciones registradas.</Card>
          )}
          {obs.filter((o) => o.tipo !== "observacion").map((o) => (
            <Card key={o.id} className={`p-4 border-l-4 ${o.tipo === "positiva" ? "border-l-success" : "border-l-destructive"}`}>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="uppercase font-medium">{o.tipo}</span>
                <span>{o.fecha}</span>
              </div>
              <div className="text-sm">{o.descripcion}</div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="res" className="mt-4 space-y-3">
          {res.length === 0 && <Card className="p-6 text-center text-muted-foreground">Sin resoluciones PIE.</Card>}
          {res.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge>{r.tipo}</Badge>
                <Badge variant="outline">{r.estado}</Badge>
              </div>
              <div className="text-sm">{r.descripcion}</div>
              <div className="text-xs text-muted-foreground mt-2">{r.profesional} · {r.bloque} · {r.fecha}</div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
