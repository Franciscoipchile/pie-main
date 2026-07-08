import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { logAction } from "@/store";

export type TipoAlerta = "Alerta urgente" | "Observación general" | "Solicitud de reunión";
export const TIPOS_ALERTA: TipoAlerta[] = [
  "Alerta urgente",
  "Observación general",
  "Solicitud de reunión",
];

export type EstadoAlerta = "Enviada" | "Vista" | "Respondida";
export type EstadoReunion = "Pendiente" | "Confirmada" | "Cancelada";

export interface Alerta {
  id: string;
  alumnoId: string;
  profesor: string;
  tipo: TipoAlerta;
  mensaje: string;
  fecha: string; // ISO
  estado: EstadoAlerta;
  leida?: boolean;
  respuesta?: string;
  respondidaTs?: string;
}

export interface Reunion {
  id: string;
  profesor: string;
  motivo: string;
  fechaHora: string; // datetime-local
  mensaje: string;
  estado: EstadoReunion;
  createdTs: string;
  motivoNoAsistencia?: string;
}

interface State {
  alertas: Alerta[];
  reuniones: Reunion[];
  enviarAlerta: (input: Omit<Alerta, "id" | "fecha" | "estado">) => void;
  setEstadoAlerta: (id: string, estado: EstadoAlerta) => void;
  marcarAlertaLeida: (id: string) => void;
  responderAlerta: (id: string, respuesta: string) => void;
  solicitarReunion: (input: Omit<Reunion, "id" | "createdTs" | "estado">) => void;
  setEstadoReunion: (id: string, estado: EstadoReunion, motivo?: string) => void;
}

export const useCoordinacion = create<State>()(
  persist(
    (set) => ({
      alertas: [],
      reuniones: [],
      enviarAlerta: (input) => {
        const a: Alerta = {
          ...input,
          id: crypto.randomUUID(),
          fecha: new Date().toISOString(),
          estado: "Enviada",
          leida: false,
        };
        set((s) => ({ alertas: [a, ...s.alertas] }));
        logAction({
          accion: "Alerta enviada a profesor",
          modulo: "Coordinación",
          tipo: "creacion",
          detalle: `${input.tipo} → ${input.profesor}`,
        });
      },
      setEstadoAlerta: (id, estado) => {
        set((s) => ({
          alertas: s.alertas.map((a) => (a.id === id ? { ...a, estado } : a)),
        }));
        logAction({
          accion: "Estado alerta actualizado",
          modulo: "Coordinación",
          tipo: "edicion",
          detalle: `→ ${estado}`,
        });
      },
      marcarAlertaLeida: (id) => {
        set((s) => ({
          alertas: s.alertas.map((a) =>
            a.id === id ? { ...a, leida: true, estado: a.estado === "Enviada" ? "Vista" : a.estado } : a,
          ),
        }));
      },
      responderAlerta: (id, respuesta) => {
        set((s) => ({
          alertas: s.alertas.map((a) =>
            a.id === id
              ? { ...a, respuesta, respondidaTs: new Date().toISOString(), estado: "Respondida", leida: true }
              : a,
          ),
        }));
        logAction({
          accion: "Alerta respondida",
          modulo: "Coordinación",
          tipo: "edicion",
          detalle: respuesta.slice(0, 80),
        });
      },
      solicitarReunion: (input) => {
        const r: Reunion = {
          ...input,
          id: crypto.randomUUID(),
          createdTs: new Date().toISOString(),
          estado: "Pendiente",
        };
        set((s) => ({ reuniones: [r, ...s.reuniones] }));
        logAction({
          accion: "Reunión solicitada",
          modulo: "Coordinación",
          tipo: "creacion",
          detalle: `${input.profesor} · ${input.fechaHora}`,
        });
      },
      setEstadoReunion: (id, estado, motivo) => {
        set((s) => ({
          reuniones: s.reuniones.map((r) =>
            r.id === id ? { ...r, estado, motivoNoAsistencia: motivo ?? r.motivoNoAsistencia } : r,
          ),
        }));
        logAction({
          accion: "Estado reunión actualizado",
          modulo: "Coordinación",
          tipo: "edicion",
          detalle: `→ ${estado}${motivo ? ` · ${motivo}` : ""}`,
        });
      },
    }),
    {
      name: "pie-coordinacion-v2",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
    },
  ),
);

export const PROFESORES_MOCK: string[] = [];
