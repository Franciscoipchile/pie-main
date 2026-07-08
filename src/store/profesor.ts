import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logAction } from "@/store";

export type AsuntoMensaje =
  | "Consulta sobre alumno"
  | "Solicitar reunión"
  | "Informar situación"
  | "Otro";

export const ASUNTOS_MENSAJE: AsuntoMensaje[] = [
  "Consulta sobre alumno",
  "Solicitar reunión",
  "Informar situación",
  "Otro",
];

export type EstadoMensaje = "Enviado" | "Leído" | "Respondido";

export interface MensajeProfesor {
  id: string;
  profesor: string; // remitente (profesor)
  asunto: AsuntoMensaje;
  alumnoId?: string;
  mensaje: string;
  fecha: string; // ISO
  estado: EstadoMensaje;
}

interface State {
  mensajes: MensajeProfesor[];
  enviarMensaje: (input: Omit<MensajeProfesor, "id" | "fecha" | "estado">) => void;
  setEstadoMensaje: (id: string, estado: EstadoMensaje) => void;
}

export const useProfesorMensajes = create<State>()(
  persist(
    (set) => ({
      mensajes: [],
      enviarMensaje: (input) => {
        const m: MensajeProfesor = {
          ...input,
          id: crypto.randomUUID(),
          fecha: new Date().toISOString(),
          estado: "Enviado",
        };
        set((s) => ({ mensajes: [m, ...s.mensajes] }));
        logAction({
          accion: "Mensaje enviado a PIE",
          modulo: "Coordinación",
          tipo: "creacion",
          detalle: `${input.profesor} · ${input.asunto}`,
        });
      },
      setEstadoMensaje: (id, estado) =>
        set((s) => ({
          mensajes: s.mensajes.map((m) => (m.id === id ? { ...m, estado } : m)),
        })),
    }),
    {
      name: "pie-prof-mensajes-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);
