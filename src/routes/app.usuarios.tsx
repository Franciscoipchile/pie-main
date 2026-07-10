import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, type Role } from "@/store";
import {
  useUsuarios,
  ROLE_LABEL,
  roleBadgeCls,
  type Usuario,
} from "@/store/usuarios";
import { cn } from "@/lib/utils";
import { Trash2, UserPlus, BookOpen, Network, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/usuarios")({
  beforeLoad: () => {
    const role = useAuth.getState().user?.role;
    if (role !== "admin") throw redirect({ to: "/app" });
  },
  component: UsuariosView,
});

// Cliente temporal de Supabase para registro de usuarios sin persistir la sesión.
// Evita cerrar la sesión actual del Administrador al llamar a signUp.
const tempSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

const Req = () => <span className="text-destructive" aria-hidden>*</span>;

function UsuariosView() {
  const { usuarios, addUsuario, removeUsuario } = useUsuarios();

  // ----- Estados Usuarios -----
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [role, setRole] = useState<Role>("profesor");
  const [rut, setRut] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [touched, setTouched] = useState(false);
  const [toDelete, setToDelete] = useState<Usuario | null>(null);
  const [creando, setCreando] = useState(false);

  // ----- Estados Asignaturas Maestras -----
  const [asignaturasMaestras, setAsignaturasMaestras] = useState<any[]>([]);
  const [nuevaAsignaturaNombre, setNuevaAsignaturaNombre] = useState("");
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false);

  // ----- Configuración de Malla por Curso -----
  const [cursosSistema, setCursosSistema] = useState<any[]>([]);
  const [cursoMallaSeleccionado, setCursoMallaSeleccionado] = useState<string>("");
  const [asignaturasAsignadasAlCurso, setAsignaturasAsignadasAlCurso] = useState<string[]>([]);
  const [guardandoMalla, setGuardandoMalla] = useState(false);
  const [loadingMalla, setLoadingMalla] = useState(false);

  // Cargar datos iniciales desde Supabase
  const cargarDatosIniciales = async () => {
    setLoadingAsignaturas(true);
    try {
      const { data: asigData } = await supabase.from("asignaturas").select("*").order("nombre");
      if (asigData) setAsignaturasMaestras(asigData);

      const { data: cursosData } = await supabase.from("cursos").select("*").order("numero");
      if (cursosData) {
        setCursosSistema(cursosData);
        if (cursosData.length > 0) setCursoMallaSeleccionado(cursosData[0].id);
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoadingAsignaturas(false);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // CARGAR / VER LA MALLA EN TIEMPO REAL AL SELECCIONAR UN CURSO
  const cargarMallaDelCurso = async () => {
    if (!cursoMallaSeleccionado) return;
    setLoadingMalla(true);
    try {
      const { data, error } = await supabase
        .from("curso_asignaturas")
        .select("asignatura_id")
        .eq("curso_id", cursoMallaSeleccionado);
      
      if (error) throw error;
      if (data) {
        setAsignaturasAsignadasAlCurso(data.map(item => item.asignatura_id));
      }
    } catch (err: any) {
      console.error("Error al cargar la malla:", err.message);
    } finally {
      setLoadingMalla(false);
    }
  };

  useEffect(() => {
    cargarMallaDelCurso();
  }, [cursoMallaSeleccionado]);

  // GUARDAR / EDITAR LA MALLA
  const handleGuardarMalla = async () => {
    if (!cursoMallaSeleccionado) return;
    setGuardandoMalla(true);
    try {
      const { error: deleteError } = await supabase
        .from("curso_asignaturas")
        .delete()
        .eq("curso_id", cursoMallaSeleccionado);
      
      if (deleteError) throw deleteError;

      if (asignaturasAsignadasAlCurso.length > 0) {
        const nuevosRegistros = asignaturasAsignadasAlCurso.map(aId => ({
          curso_id: cursoMallaSeleccionado,
          asignatura_id: aId
        }));
        
        const { error: insertError } = await supabase
          .from("curso_asignaturas")
          .insert(nuevosRegistros);
          
        if (insertError) throw insertError;
      }
      
      toast.success("✓ Malla curricular guardada y actualizada con éxito.");
      cargarMallaDelCurso();
    } catch (err: any) {
      toast.error("✗ Error al actualizar la malla: " + err.message);
    } finally {
      setGuardandoMalla(false);
    }
  };

  const handleToggleAsignaturaMalla = (asigId: string) => {
    if (asignaturasAsignadasAlCurso.includes(asigId)) {
      setAsignaturasAsignadasAlCurso(asignaturasAsignadasAlCurso.filter(id => id !== asigId));
    } else {
      setAsignaturasAsignadasAlCurso([...asignaturasAsignadasAlCurso, asigId]);
    }
  };

  const handleQuitarAsignaturaDirecto = (asigId: string) => {
    setAsignaturasAsignadasAlCurso(asignaturasAsignadasAlCurso.filter(id => id !== asigId));
  };

  const handleCrearAsignatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAsignaturaNombre.trim()) {
      toast.error("✗ El nombre de la asignatura no puede estar vacío");
      return;
    }
    try {
      const { error } = await supabase.from("asignaturas").insert({ nombre: nuevaAsignaturaNombre.trim() });
      if (error) throw error;
      toast.success(`✓ Asignatura "${nuevaAsignaturaNombre.trim()}" creada`);
      setNuevaAsignaturaNombre("");
      cargarDatosIniciales();
    } catch (err: any) {
      toast.error("✗ Error: " + err.message);
    }
  };

  const handleEliminarAsignatura = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta asignatura globalmente?")) return;
    try {
      await supabase.from("asignaturas").delete().eq("id", id);
      toast.success("✓ Asignatura eliminada");
      cargarDatosIniciales();
    } catch (err: any) {
      toast.error("✗ Error: " + err.message);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      const { error } = await supabase.from("usuarios").delete().eq("id", toDelete.id);
      if (error) throw error;
      removeUsuario(toDelete.id);
      toast.success("✓ Usuario eliminado correctamente");
    } catch (err: any) {
      toast.error("✗ Error al eliminar usuario: " + err.message);
    } finally {
      // Corregido: cambiada de setDelete a setToDelete
      setToDelete(null); 
    }
  };

  const reset = () => {
    setNombre("");
    setApellidos("");
    setRut("");
    setEmail("");
    setPass("");
    setTouched(false);
  };

  const missing = !nombre.trim() || !apellidos.trim();

  const handleAdd = async () => {
    if (missing || !email.trim() || !pass.trim()) {
      toast.error("✗ Por favor completa los campos requeridos");
      return;
    }
    setCreando(true);
    try {
      // Mapear el rol del formulario al formato esperado por la Base de Datos
      const mappedRole = role === "encargada" ? "profesora_pie" : role === "admin" ? "administrador" : "profesor";

      // 1. Registrar al usuario en Supabase Auth usando el cliente temporal sin persistencia de sesión
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pass.trim(),
      });

      if (authError) throw authError;

      const newUser = authData.user;
      if (!newUser?.id) {
        throw new Error("No se pudo obtener el ID del usuario creado en Supabase Auth.");
      }

      // 2. Registrar/actualizar el perfil del usuario (Usamos upsert por si un trigger de base de datos ya auto-creó la fila al registrarse la cuenta en Auth)
      const { error: errUser } = await supabase.from("usuarios").upsert({
        id: newUser.id,
        nombre: nombre.trim(),
        apellido: apellidos.trim(),
        rol: mappedRole,
        rut: rut.trim() || null,
        email: email.trim().toLowerCase(),
        activo: true // Aseguramos que entre activo
      });
      
      if (errUser) throw errUser;

      // 3. Lo agregamos al store local usando el ID real
      addUsuario({
        id: newUser.id,
        nombre: `${nombre.trim()} ${apellidos.trim()}`,
        role,
        rut: rut.trim() || undefined,
        email: email.trim().toLowerCase() || undefined,
      });

      toast.success(`✓ Usuario registrado y cuenta de acceso creada con éxito`);
      reset();
      
      // 4. Recargamos de forma segura. Como no tocamos Auth en el cliente principal, sigues siendo Admin.
      window.location.reload();

    } catch (err: any) {
      toast.error("✗ Error al registrar: " + err.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Estructura Curricular y Personal</h2>
        <p className="text-sm text-muted-foreground">Configura las mallas de asignaturas por nivel, asignaturas maestras y cuentas de usuario.</p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="mb-4">
  <TabsTrigger value="usuarios">Cuentas y Usuarios</TabsTrigger>
  <TabsTrigger value="asignaturas" className="gap-1.5"><BookOpen className="size-3.5" /> Asignaturas</TabsTrigger>
  {/* La pestaña de mallas la dejamos oculta borrando o comentando esta línea: */}
  {/* <TabsTrigger value="mallas" className="gap-1.5"><Network className="size-3.5" /> Mallas por Curso</TabsTrigger> */}
</TabsList>

        {/* PESTAÑA 1: USUARIOS */}
        <TabsContent value="usuarios" className="space-y-6">
          <Card className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              <h3 className="font-semibold">Nuevo usuario</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre <Req /></Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Andrés" />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos <Req /></Label>
                <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Ej: Vega" />
              </div>
              <div className="space-y-1.5">
                <Label>Rol <Req /></Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encargada">Profesora PIE</SelectItem>
                    <SelectItem value="profesor">Profesor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>RUT</Label>
                <Input value={rut} onChange={(e) => setRut(e.target.value)} placeholder="12.345.678-9" />
              </div>
              <div className="space-y-1.5">
                <Label>Email <Req /></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@colegio.cl" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Contraseña <Req /></Label>
                <Input type="text" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Contraseña de acceso" />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={handleAdd} className="bg-[#1D9E75] text-white" disabled={creando}>Crear usuario</Button>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-semibold">Usuarios registrados ({usuarios.length})</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div>{u.nombre}</div>
                        {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", roleBadgeCls(u.role))}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
  <div className="flex items-center justify-end gap-1">
    
    {/* PEGA ESTE BOTÓN AQUÍ EN TU CÓDIGO ORIGINAL */}
    <Button 
      variant="ghost" 
      size="sm" 
      title="Enviar enlace de recuperación de clave"
      onClick={async () => {
        if (!u.email) {
          alert("Este usuario no tiene un correo registrado.");
          return;
        }
        try {
          await supabase.auth.resetPasswordForEmail(u.email, {
            redirectTo: `${window.location.origin}/actualizar-password`,
          });
          alert(`¡Enlace enviado al correo: ${u.email}`);
        } catch (err) {
          alert("Error al enviar el enlace.");
        }
      }}
    >
      {/* Puedes usar un texto simple o un emoji si no quieres importar un icono nuevo: 🔑 */}
      <span className="text-sm">🔑</span> 
    </Button>

    <Button variant="ghost" size="sm" onClick={() => setToDelete(u)}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  </div>
</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: ASIGNATURAS MAESTRAS */}
        <TabsContent value="asignaturas" className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold">Crear Asignatura</h3>
            <form onSubmit={handleCrearAsignatura} className="flex gap-3 max-w-xl items-end">
              <div className="flex-1 space-y-1.5">
                <Label>Nombre de la Asignatura</Label>
                <Input value={nuevaAsignaturaNombre} onChange={(e) => setNuevaAsignaturaNombre(e.target.value)} placeholder="Ej: Música" />
              </div>
              <Button type="submit" className="bg-emerald-600 text-white">Registrar</Button>
            </form>
          </Card>
          <Card className="p-5">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
              <TableBody>
                {asignaturasMaestras.map(asig => (
                  <TableRow key={asig.id}>
                    <TableCell className="font-medium uppercase text-xs">{asig.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" onClick={() => handleEliminarAsignatura(asig.id)}><Trash2 className="size-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* PESTAÑA 3: MALLAS POR CURSO */}
        <TabsContent value="mallas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card className="p-5 space-y-4 h-fit border">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-semibold text-sm">1. Selector de Grado / Curso</Label>
                  <p className="text-xs text-muted-foreground mb-2">Selecciona la sala para inspeccionar y editar sus asignaturas vigentes.</p>
                  <select
                    className="w-full h-11 border rounded-lg px-3 bg-background text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    value={cursoMallaSeleccionado}
                    onChange={(e) => setCursoMallaSeleccionado(e.target.value)}
                  >
                    {cursosSistema.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.numero}° {c.letra} ({c.nivel === "basica" ? "Básico" : "Medio"})
                      </option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={handleGuardarMalla} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold text-xs uppercase tracking-wider"
                  disabled={guardandoMalla}
                >
                  {guardandoMalla ? "Guardando Cambios..." : "Guardar Malla Curricular"}
                </Button>
              </Card>

              <Card className="p-5 border space-y-3 bg-muted/20">
                <div className="flex items-center gap-1.5 border-b pb-2">
                  <CheckCircle className="size-4 text-blue-600" />
                  <h4 className="font-bold text-xs uppercase text-slate-700 tracking-wide">Malla Actual del Nivel</h4>
                </div>
                
                {loadingMalla ? (
                  <p className="text-xs text-muted-foreground animate-pulse py-2">Leyendo base de datos...</p>
                ) : asignaturasAsignadasAlCurso.length === 0 ? (
                  <p className="text-xs text-amber-600 flex items-center gap-1 py-2 font-medium">
                    <AlertCircle className="size-3.5" /> El curso no tiene materias asignadas.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {asignaturasAsignadasAlCurso.map(aId => {
                      const asigObj = asignaturasMaestras.find(m => m.id === aId);
                      return asigObj ? (
                        <div key={aId} className="flex items-center justify-between bg-background border px-3 py-1.5 rounded-lg text-xs shadow-sm group">
                          <span className="font-semibold text-slate-700 truncate uppercase tracking-wide text-[11px]">{asigObj.nombre}</span>
                          <button
                            type="button"
                            onClick={() => handleQuitarAsignaturaDirecto(aId)}
                            className="text-muted-foreground hover:text-destructive p-0.5"
                            title="Remover de la malla"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-5 lg:col-span-2 space-y-3 border">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-base text-slate-800">2. Modificar Catálogo y Checkboxes Curriculares</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Marca o desmarca las asignaturas. El monitor de la izquierda cambiará en tiempo real. Presiona "Guardar" para aplicar cambios.</p>
              </div>
              
              {asignaturasMaestras.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No hay asignaturas maestras creadas en la base de datos.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {asignaturasMaestras.map((asig) => {
                    const estaChequeado = asignaturasAsignadasAlCurso.includes(asig.id);
                    return (
                      <div 
                        key={asig.id} 
                        onClick={() => handleToggleAsignaturaMalla(asig.id)}
                        className={cn(
                          "flex items-center space-x-3 p-3 border rounded-xl cursor-pointer select-none transition-all shadow-sm",
                          estaChequeado 
                            ? "border-blue-500 bg-blue-50/30 text-blue-900 ring-1 ring-blue-500/30" 
                            : "border-border hover:bg-muted/40"
                        )}
                      >
                        <Checkbox 
                          id={`malla-asig-${asig.id}`}
                          checked={estaChequeado}
                          onCheckedChange={() => {}} 
                        />
                        <label 
                          htmlFor={`malla-asig-${asig.id}`} 
                          className="text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer truncate flex-1"
                        >
                          {asig.nombre}
                        </label>
                        {estaChequeado && (
                          <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-normal text-[9px] h-4 px-1 rounded">
                            Malla
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL ELIMINAR USUARIO */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará al usuario <strong>{toDelete?.nombre}</strong> del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}