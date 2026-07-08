import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  alumnosMock,
  observacionesMock,
  notasMock,
  resolucionesMock,
  citacionesMock,
  type Alumno,
  type Observacion,
  type Nota,
  type Asistencia,
  type Resolucion,
  type Citacion,
} from "@/lib/mock-data";

export type Role = "encargada" | "profesor" | "admin";

export interface AuthUser {
  name: string;
  role: Role;
  /** Asignaturas que el profesor puede gestionar. Vacío para otros roles. */
  asignaturas?: string[];
}

interface AuthState {
  user: AuthUser | null;
  hasHydrated: boolean;
  login: (name: string, role: Role, asignaturas?: string[]) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      login: (name, role, asignaturas) => {
        const u: AuthUser = { name, role, asignaturas: role === "profesor" ? asignaturas ?? [] : [] };
        set({ user: u });
        // Log de sesión
        useLog.getState().addLog({
          usuario: u.name,
          rol: u.role,
          accion: "Inicio de sesión",
          tipo: "sesion",
          modulo: "Sesión",
          detalle: `Ingresó como ${ROLE_LABEL[u.role]}`,
        });
      },
      logout: () => {
        const u = useAuth.getState().user;
        if (u) {
          useLog.getState().addLog({
            usuario: u.name,
            rol: u.role,
            accion: "Cierre de sesión",
            tipo: "sesion",
            modulo: "Sesión",
            detalle: "Sesión cerrada",
          });
        }
        set({ user: null });
      },
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "pie-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

const ROLE_LABEL: Record<Role, string> = {
  encargada: "Encargada PIE",
  profesor: "Profesor",
  admin: "Administrador",
};

// ============================================================
// LOG / AUDITORÍA — solo lectura (admin)
// ============================================================
export type LogModulo =
  | "Alumnos"
  | "Notas"
  | "Anotaciones"
  | "Intervenciones"
  | "Usuarios"
  | "Control clases"
  | "Coordinación"
  | "Informes"
  | "Sesión";

export type LogTipo = "creacion" | "edicion" | "eliminacion" | "sesion";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO
  usuario: string;
  rol: Role | "sistema";
  accion: string;
  modulo: LogModulo;
  tipo: LogTipo;
  detalle?: string;
}

interface LogState {
  logs: LogEntry[];
  addLog: (e: Omit<LogEntry, "id" | "timestamp">) => void;
}

export const useLog = create<LogState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (e) =>
        set((s) => ({
          logs: [
            { ...e, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
            ...s.logs,
          ],
        })),
    }),
    {
      name: "pie-logs-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);

/** Helper interno: obtiene el actor actual o un usuario "sistema". */
function actor() {
  const u = useAuth.getState().user;
  return {
    usuario: u?.name ?? "sistema",
    rol: (u?.role ?? "sistema") as Role | "sistema",
  };
}

/** Helper público para registrar acciones desde cualquier vista. */
export function logAction(input: {
  accion: string;
  modulo: LogModulo;
  tipo: LogTipo;
  detalle?: string;
}) {
  useLog.getState().addLog({ ...actor(), ...input });
}

interface DataState {
  alumnos: Alumno[];
  observaciones: Observacion[];
  notas: Nota[];
  asistencia: Asistencia[];
  resoluciones: Resolucion[];
  citaciones: Citacion[];
  addAlumno: (a: Omit<Alumno, "id">) => void;
  addObservacion: (o: Omit<Observacion, "id">) => void;
  addNota: (n: Omit<Nota, "id">) => void;
  updateNota: (id: string, patch: Partial<Nota>) => void;
  deleteNota: (id: string) => void;
  toggleNotaCerrada: (id: string, cerrada: boolean) => void;
  appendAsistencia: (a: Asistencia[]) => void;
  addResolucion: (r: Omit<Resolucion, "id">) => void;
  addCitacion: (c: Omit<Citacion, "id">) => void;
}

export const useData = create<DataState>((set, get) => ({
  alumnos: alumnosMock,
  observaciones: observacionesMock,
  notas: notasMock,
  asistencia: [],
  resoluciones: resolucionesMock,
  citaciones: citacionesMock,
  addAlumno: (a) => {
    set((s) => ({ alumnos: [...s.alumnos, { ...a, id: crypto.randomUUID() }] }));
    logAction({
      accion: "Alumno creado",
      modulo: "Alumnos",
      tipo: "creacion",
      detalle: `${a.nombre} — ${a.curso} (${a.nee})`,
    });
  },
  addObservacion: (o) => {
    set((s) => ({ observaciones: [{ ...o, id: crypto.randomUUID() }, ...s.observaciones] }));
    const al = get().alumnos.find((x) => x.id === o.alumnoId);
    logAction({
      accion: "Anotación creada",
      modulo: "Anotaciones",
      tipo: "creacion",
      detalle: `${al?.nombre ?? o.alumnoId} · ${o.tipo} · ${o.comportamiento}`,
    });
  },
  addNota: (n) => {
    set((s) => ({ notas: [{ ...n, id: crypto.randomUUID() }, ...s.notas] }));
    const al = get().alumnos.find((x) => x.id === n.alumnoId);
    logAction({
      accion: "Nota creada",
      modulo: "Notas",
      tipo: "creacion",
      detalle: `${al?.nombre ?? n.alumnoId} · ${n.asignatura} · ${n.nota.toFixed(1)}`,
    });
  },
  updateNota: (id, patch) => {
    const prev = get().notas.find((n) => n.id === id);
    set((s) => ({ notas: s.notas.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
    const al = get().alumnos.find((x) => x.id === prev?.alumnoId);
    const cambios: string[] = [];
    if (patch.nota !== undefined && prev && patch.nota !== prev.nota) {
      cambios.push(`nota ${prev.nota.toFixed(1)} → ${patch.nota.toFixed(1)}`);
    }
    if (patch.cerrada !== undefined && prev && patch.cerrada !== prev.cerrada) {
      cambios.push(`${prev.cerrada ? "cerrada" : "abierta"} → ${patch.cerrada ? "cerrada" : "abierta"}`);
    }
    logAction({
      accion: "Nota editada",
      modulo: "Notas",
      tipo: "edicion",
      detalle: `${al?.nombre ?? "—"} · ${prev?.asignatura ?? ""} · ${cambios.join(", ") || "actualizada"}`,
    });
  },
  deleteNota: (id) => {
    const prev = get().notas.find((n) => n.id === id);
    set((s) => ({ notas: s.notas.filter((n) => n.id !== id) }));
    const al = get().alumnos.find((x) => x.id === prev?.alumnoId);
    logAction({
      accion: "Nota eliminada",
      modulo: "Notas",
      tipo: "eliminacion",
      detalle: `${al?.nombre ?? "—"} · ${prev?.asignatura ?? ""} · nota ${prev?.nota.toFixed(1) ?? "—"}`,
    });
  },
  toggleNotaCerrada: (id, cerrada) => {
    const prev = get().notas.find((n) => n.id === id);
    set((s) => ({ notas: s.notas.map((n) => (n.id === id ? { ...n, cerrada } : n)) }));
    const al = get().alumnos.find((x) => x.id === prev?.alumnoId);
    logAction({
      accion: cerrada ? "Nota cerrada" : "Nota reabierta",
      modulo: "Notas",
      tipo: "edicion",
      detalle: `${al?.nombre ?? "—"} · ${prev?.asignatura ?? ""} · ${prev?.cerrada ? "cerrada" : "abierta"} → ${cerrada ? "cerrada" : "abierta"}`,
    });
  },
  appendAsistencia: (a) => {
    set((s) => {
      const keys = new Set(a.map((x) => `${x.alumnoId}|${x.fecha}|${x.bloque}`));
      const filtered = s.asistencia.filter((x) => !keys.has(`${x.alumnoId}|${x.fecha}|${x.bloque}`));
      return { asistencia: [...filtered, ...a.map((x) => ({ ...x, id: x.id ?? crypto.randomUUID() }))] };
    });
    logAction({
      accion: "Asistencia registrada",
      modulo: "Control clases",
      tipo: "creacion",
      detalle: `${a.length} registro${a.length !== 1 ? "s" : ""} de salida/retorno`,
    });
  },
  addResolucion: (r) => {
    set((s) => ({ resoluciones: [{ ...r, id: crypto.randomUUID() }, ...s.resoluciones] }));
    const al = get().alumnos.find((x) => x.id === r.alumnoId);
    logAction({
      accion: "Intervención PIE registrada",
      modulo: "Intervenciones",
      tipo: "creacion",
      detalle: `${al?.nombre ?? r.alumnoId} · ${r.tipo}`,
    });
  },
  addCitacion: (c) => {
    set((s) => ({ citaciones: [{ ...c, id: crypto.randomUUID() }, ...s.citaciones] }));
    const al = get().alumnos.find((x) => x.id === c.alumnoId);
    logAction({
      accion: "Citación creada",
      modulo: "Informes",
      tipo: "creacion",
      detalle: `${al?.nombre ?? c.alumnoId} · dirigida a ${c.dirigidoA ?? "—"}`,
    });
  },
}));

// ============================================================
// Permisos generales (asistencia, anotaciones, informes, alumnos)
// ============================================================
export const canEdit = (role?: Role) => role === "encargada" || role === "admin";

/** Solo el admin ve el módulo de logs. */
export const canViewLogs = (role?: Role) => role === "admin";

// ============================================================
// Permisos del módulo NOTAS — fuente única de verdad
// ============================================================
export const canViewNotas = (role?: Role) =>
  role === "encargada" || role === "profesor" || role === "admin";

export const canCreateNota = (user: AuthUser | null, asignatura?: string): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "profesor") {
    if (!asignatura) return (user.asignaturas?.length ?? 0) > 0;
    return user.asignaturas?.includes(asignatura) ?? false;
  }
  return false;
};

export const canEditNota = (user: AuthUser | null, nota: Nota): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "profesor") {
    if (nota.cerrada) return false;
    return user.asignaturas?.includes(nota.asignatura) ?? false;
  }
  return false;
};

export const canDeleteNota = (user: AuthUser | null): boolean => user?.role === "admin";
export const canCloseNotas = (user: AuthUser | null): boolean => user?.role === "admin";
export const isNotasReadOnly = (role?: Role) => role === "encargada";
