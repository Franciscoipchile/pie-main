import { useUsuarios, type Asignacion } from "@/store/usuarios";
import type { AuthUser } from "@/store";

/** Normaliza un nombre de curso a la forma corta usada en mock-data (ej: "5°A"). */
export function normalizeCurso(curso: string): string {
  // Quita "Básico"/"Medio" y espacios, deja "5°A"
  return curso
    .replace(/Básico|Basico|Medio/gi, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

/** Convierte "5°A" a forma larga ("5° Básico A") si es necesario para mostrar. */
export function expandCurso(curso: string): string {
  const m = curso.match(/^(\d+°)\s*(básico|basico|medio)?\s*([A-D])$/i);
  if (!m) return curso;
  const num = m[1];
  const letra = m[3];
  const tipo = m[2]
    ? /medio/i.test(m[2])
      ? "Medio"
      : "Básico"
    : parseInt(num) <= 8
      ? "Básico"
      : "Medio";
  return `${num} ${tipo} ${letra}`;
}

/** Obtiene asignaciones (asignatura + cursos) del profesor logueado consultando useUsuarios. */
export function getAsignacionesProfesor(user: AuthUser | null): Asignacion[] {
  if (!user || user.role !== "profesor") return [];
  const u = useUsuarios
    .getState()
    .usuarios.find(
      (x) => x.role === "profesor" && x.nombre.toLowerCase() === user.name.toLowerCase(),
    );
  return u?.asignaciones ?? [];
}

/** Lista plana de todos los cursos asignados al profesor (normalizados). */
export function getCursosProfesor(user: AuthUser | null): string[] {
  const asigns = getAsignacionesProfesor(user);
  const set = new Set<string>();
  asigns.forEach((a) => a.cursos.forEach((c) => set.add(c)));
  return Array.from(set);
}

/** Verifica si un curso (formato cualquiera) pertenece al profesor. */
export function profesorTieneCurso(user: AuthUser | null, curso: string): boolean {
  const cursos = getCursosProfesor(user);
  const norm = normalizeCurso(curso);
  return cursos.some((c) => normalizeCurso(c) === norm);
}
