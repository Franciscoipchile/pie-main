import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logAction } from "@/store";

export type MotivoSalida =
  | "Apoyo pedagógico"
  | "Control rápido"
  | "Seguimiento emocional"
  | "Seguimiento conductual"
  | "Evaluación"
  | "Otro";

export const MOTIVOS_SALIDA: MotivoSalida[] = [
  "Apoyo pedagógico",
  "Control rápido",
  "Seguimiento emocional",
  "Seguimiento conductual",
  "Evaluación",
  "Otro",
];

export interface SalidaClase {
  id: string;
  alumnoId: string;
  curso: string;
  fecha: string; // yyyy-mm-dd
  horaSalida: string; // HH:mm
  motivo: MotivoSalida;
  profesional: string;
  horaRetorno?: string; // HH:mm
  resultado?: string;
  /** ISO timestamp del momento exacto de salida (para el contador en vivo). */
  salidaTs: string;
  /** ISO del retorno. */
  retornoTs?: string;
}

interface SalidasState {
  salidas: SalidaClase[];
  registrarSalida: (input: Omit<SalidaClase, "id" | "salidaTs" | "horaRetorno" | "resultado" | "retornoTs">) => void;
  registrarRetorno: (id: string, horaRetorno: string, resultado: string) => void;
}

export const useSalidas = create<SalidasState>()(
  persist(
    (set, get) => ({
      salidas: [],
      registrarSalida: (input) => {
        const nueva: SalidaClase = {
          ...input,
          id: crypto.randomUUID(),
          salidaTs: new Date().toISOString(),
        };
        set((s) => ({ salidas: [nueva, ...s.salidas] }));
        logAction({
          accion: "Salida a PIE registrada",
          modulo: "Control clases",
          tipo: "creacion",
          detalle: `${input.curso} · ${input.horaSalida} · ${input.motivo} · ${input.profesional}`,
        });
      },
      registrarRetorno: (id, horaRetorno, resultado) => {
        const prev = get().salidas.find((x) => x.id === id);
        set((s) => ({
          salidas: s.salidas.map((x) =>
            x.id === id
              ? { ...x, horaRetorno, resultado, retornoTs: new Date().toISOString() }
              : x,
          ),
        }));
        logAction({
          accion: "Retorno a sala registrado",
          modulo: "Control clases",
          tipo: "edicion",
          detalle: `${prev?.curso ?? "—"} · salida ${prev?.horaSalida ?? "—"} → retorno ${horaRetorno}`,
        });
      },
    }),
    {
      name: "pie-salidas-clase-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
