import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logAction, type Role } from "@/store";

/** Una asignatura asignada a un profesor con la lista de cursos donde la dicta. */
export interface Asignacion {
  asignatura: string;
  cursos: string[]; // ej: ["7° Básico A", "8° Básico B"]
}

export interface Usuario {
  id: string;
  nombre: string;
  role: Role;
  /** Compatibilidad antigua: asignatura única (se mantiene para no romper otras vistas). */
  asignatura?: string;
  rut?: string;
  email?: string;
  /** Solo para rol "profesor". Lista de asignaturas + cursos asignados por Administrador. */
  asignaciones?: Asignacion[];
}

const SEED: Usuario[] = [
  { id: "u-admin", nombre: "Administrador", role: "admin" },
  { id: "u-encargada", nombre: "Profesora PIE", role: "encargada" },
  { id: "u-profesor", nombre: "Profesor", role: "profesor", asignaciones: [] },
];

interface State {
  usuarios: Usuario[];
  addUsuario: (u: Omit<Usuario, "id">) => void;
  updateUsuario: (id: string, patch: Partial<Usuario>) => void;
  removeUsuario: (id: string) => void;
}

export const useUsuarios = create<State>()(
  persist(
    (set) => ({
      usuarios: SEED,
      addUsuario: (u) => {
        const nuevo: Usuario = { ...u, id: crypto.randomUUID() };
        set((s) => ({ usuarios: [...s.usuarios, nuevo] }));
        logAction({
          accion: "Usuario creado",
          modulo: "Usuarios",
          tipo: "creacion",
          detalle: `${nuevo.nombre} · ${nuevo.role}${
            nuevo.asignaciones?.length
              ? ` · ${nuevo.asignaciones.map((a) => `${a.asignatura} (${a.cursos.length})`).join(", ")}`
              : ""
          }`,
        });
      },
      updateUsuario: (id, patch) => {
        const prev = useUsuarios.getState().usuarios.find((x) => x.id === id);
        set((s) => ({
          usuarios: s.usuarios.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
        if (prev && patch.asignaciones) {
          const before = (prev.asignaciones ?? [])
            .map((a) => `${a.asignatura}: ${a.cursos.join("/")}`)
            .join(" | ") || "—";
          const after = (patch.asignaciones ?? [])
            .map((a) => `${a.asignatura}: ${a.cursos.join("/")}`)
            .join(" | ") || "—";
          logAction({
            accion: "Asignaciones actualizadas",
            modulo: "Usuarios",
            tipo: "edicion",
            detalle: `${prev.nombre} · ${before} → ${after}`,
          });
        } else if (prev) {
          logAction({
            accion: "Usuario editado",
            modulo: "Usuarios",
            tipo: "edicion",
            detalle: `${prev.nombre}`,
          });
        }
      },
      removeUsuario: (id) => {
        const prev = useUsuarios.getState().usuarios.find((x) => x.id === id);
        set((s) => ({ usuarios: s.usuarios.filter((x) => x.id !== id) }));
        if (prev) {
          logAction({
            accion: "Usuario eliminado",
            modulo: "Usuarios",
            tipo: "eliminacion",
            detalle: `${prev.nombre} · ${prev.role}`,
          });
        }
      },
    }),
    {
      name: "pie-usuarios-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);

export const ROLE_LABEL: Record<Role, string> = {
  encargada: "Profesora PIE",
  profesor: "Profesor",
  admin: "Administrador",
};

/** Clases del badge según rol. Verde=PIE, Azul=Profesor, Rojo=Admin. */
export function roleBadgeCls(role: Role): string {
  if (role === "encargada") return "bg-emerald-600 text-white hover:bg-emerald-600";
  if (role === "profesor") return "bg-blue-600 text-white hover:bg-blue-600";
  return "bg-destructive text-destructive-foreground hover:bg-destructive";
}

/** Asignaturas estándar para el formulario de asignación. */
export const ASIGNATURAS_DISPONIBLES = [
  "Matemática",
  "Lenguaje",
  "Ciencias",
  "Historia",
  "Inglés",
  "Educación Física",
  "Artes",
  "Tecnología",
  "Otra",
] as const;

/** Cursos estándar disponibles en el sistema. */
export const CURSOS_DISPONIBLES = [
  "1° Básico A", "1° Básico B",
  "2° Básico A", "2° Básico B",
  "3° Básico A", "3° Básico B",
  "4° Básico A", "4° Básico B",
  "5° Básico A", "5° Básico B",
  "6° Básico A", "6° Básico B",
  "7° Básico A", "7° Básico B",
  "8° Básico A", "8° Básico B",
  "1° Medio A", "1° Medio B",
  "2° Medio A", "2° Medio B",
  "3° Medio A", "3° Medio B",
  "4° Medio A", "4° Medio B",
] as const;
