import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AddAlumnoDialog } from "@/components/AddAlumnoDialog";
import { NeeBadge } from "@/components/NeeBadge";
import { useAuth } from "@/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

export const Route = createFileRoute("/app/alumnos/")({
  component: AlumnosList,
});

function AlumnosList() {
  const { user } = useAuth();
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [cursosDb, setCursosDb] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  
  const isEncargada = user?.role === "encargada";

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      // ¡CORREGIDO!: Agregamos "nivel" a la relación de cursos en el select
      let query = supabase.from("alumnos").select("*, cursos(numero, letra, nivel), usuarios(nombre, apellido)");
      if (isEncargada) query = query.eq("en_pie", true);
      const { data } = await query.order("apellido");
      const { data: cursos } = await supabase.from("cursos").select("*");
      setAlumnos(data || []);
      setCursosDb(cursos || []);
      setLoading(false);
    };
    cargarDatos();
  }, [isEncargada]);

  const filtrados = alumnos.filter(a => 
    `${a.nombre} ${a.apellido} ${a.rut}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight">Nómina General de Alumnos</h1>
          <p className="text-sm text-muted-foreground">Visualiza y gestiona tanto alumnos regulares como pertenecientes al programa PIE.</p>
        </div>
        {!isEncargada && <AddAlumnoDialog />}
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre, apellido o rut..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      <Card className="p-0 border-0 shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="uppercase font-bold text-xs">Alumno / Estudiante</TableHead>
              <TableHead className="uppercase font-bold text-xs">Rut</TableHead>
              <TableHead className="uppercase font-bold text-xs">Curso Regular</TableHead>
              <TableHead className="uppercase font-bold text-xs">Clasificación / NEE</TableHead>
              <TableHead className="uppercase font-bold text-xs">Profesional de Apoyo</TableHead>
              <TableHead className="uppercase font-bold text-xs text-right">Régimen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((a) => {
              // Lógica de formateo del nivel (Básica o Media)
              let textoCurso = "-";
              if (a.cursos) {
                const nivelNormalizado = a.cursos.nivel?.toLowerCase() || "";
                // Valida si contiene "basica" o "básica" para poner "Básico", de lo contrario asume "Medio"
                const indicadorNivel = nivelNormalizado.includes("basica") ? "Básico" : "Medio";
                textoCurso = `${a.cursos.numero}° ${indicadorNivel} ${a.cursos.letra}`;
              }

              return (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold text-slate-700">{a.apellido.toUpperCase()}, {a.nombre.toUpperCase()}</TableCell>
                  <TableCell className="text-slate-500 font-mono">{a.rut}</TableCell>
                  {/* ¡CELDA ACTUALIZADA!: Ahora muestra la especificación del nivel completo */}
                  <TableCell className="font-bold text-slate-800">{textoCurso}</TableCell>
                  <TableCell><NeeBadge type={a.tipo_nee || "SIN NEE"} /></TableCell>
                  <TableCell className="text-slate-500">{a.usuarios ? `${a.usuarios.nombre} ${a.usuarios.apellido}` : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={a.en_pie ? "default" : "outline"} className={a.en_pie ? "bg-indigo-600 hover:bg-indigo-700" : ""}>
                      {a.en_pie ? "PIE" : "REGULAR"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}