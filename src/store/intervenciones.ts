import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logAction } from "@/store";

export type TipoIntervencion =
  | "Intervención general"
  | "Control rápido"
  | "Seguimiento emocional-conductual"
  | "Apoyo pedagógico";

export const TIPOS_INTERVENCION: TipoIntervencion[] = [
  "Intervención general",
  "Control rápido",
  "Seguimiento emocional-conductual",
  "Apoyo pedagógico",
];

export interface Intervencion {
  id: string;
  alumnoId: string;
  tipo: TipoIntervencion;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm
  profesional: string;
  motivo: string;
  resultado: string;
  informoApoderado: boolean;
  requiereSeguimiento: boolean;
  fechaSeguimiento?: string;
  cerrada: boolean;
  createdTs: string; // ISO
}

interface State {
  intervenciones: Intervencion[];
  registrar: (input: Omit<Intervencion, "id" | "createdTs" | "cerrada">) => void;
  cerrar: (id: string) => void;
}

export const useIntervenciones = create<State>()(
  persist(
    (set, get) => ({
      intervenciones: [],
      registrar: (input) => {
        const nueva: Intervencion = {
          ...input,
          id: crypto.randomUUID(),
          createdTs: new Date().toISOString(),
          cerrada: false,
        };
        set((s) => ({ intervenciones: [nueva, ...s.intervenciones] }));
        logAction({
          accion: "Intervención PIE registrada",
          modulo: "Intervenciones",
          tipo: "creacion",
          detalle: `${input.tipo} · ${input.fecha} ${input.hora} · ${input.profesional}`,
        });
      },
      cerrar: (id) => {
        const prev = get().intervenciones.find((i) => i.id === id);
        set((s) => ({
          intervenciones: s.intervenciones.map((i) =>
            i.id === id ? { ...i, cerrada: true, requiereSeguimiento: false } : i,
          ),
        }));
        logAction({
          accion: "Intervención cerrada",
          modulo: "Intervenciones",
          tipo: "edicion",
          detalle: `${prev?.tipo ?? "—"} · ${prev?.fecha ?? ""} · seguimiento finalizado`,
        });
      },
    }),
    {
      name: "pie-intervenciones-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
