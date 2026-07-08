export type NEEType =
  | "TEL"
  | "TDAH"
  | "DEA"
  | "TEA"
  | "Discapacidad intelectual"
  | "Discapacidad visual"
  | "Discapacidad auditiva"
  | "Discapacidad motora";

export interface Alumno {
  id: string;
  nombre: string;
  curso: string;
  nee: NEEType;
  profesional: string;
  rut: string;
  fechaIngreso: string;
  nivel?: "basica" | "media";
  observacionInicial?: string;
  apoderado?: string;
  telefonoApoderado?: string;
}

export type NivelApoyo = "normal" | "mas" | "urgente";
export type Comportamiento =
  | "Participativo"
  | "Concentrado"
  | "Distraído"
  | "Retraído"
  | "Agresivo"
  | "Colaborador";

export interface Observacion {
  id: string;
  alumnoId: string;
  fecha: string;
  tipo: "positiva" | "negativa" | "observacion";
  bloque: string;
  comportamiento: string;
  descripcion: string;
  autor: string;
  nivelApoyo?: NivelApoyo;
  avisoApoderado?: boolean;
}

export interface Nota {
  id: string;
  alumnoId: string;
  asignatura: string;
  nota: number;
  tipoEvaluacion: string;
  observaciones: string;
  fecha: string;
  semestre?: "1" | "2";
  /** Nombre del profesor que registró la nota. */
  creadoPor?: string;
  /** Si está cerrada, solo admin puede editarla. */
  cerrada?: boolean;
}

export interface Asistencia {
  id?: string;
  alumnoId: string;
  fecha: string;
  estado: "presente" | "ausente" | "justificado";
  bloque: string;
}

export interface Resolucion {
  id: string;
  alumnoId: string;
  tipo: "PACI" | "Evaluación diagnóstica" | "Plan de trabajo" | "Seguimiento" | "Cierre";
  descripcion: string;
  bloque: string;
  profesional: string;
  observaciones: string;
  estado: "vigente" | "en revisión" | "pendiente";
  fecha: string;
}

export type CitacionDirigidoA = "apoderado" | "profesor" | "profesional";

export interface Citacion {
  id: string;
  alumnoId: string;
  motivo: string;
  fecha: string;
  observaciones: string;
  estado: "pendiente" | "realizada" | "cancelada";
  dirigidoA?: CitacionDirigidoA;
  destinatario?: string;
  asignatura?: string;
}

export const alumnosMock: Alumno[] = [];
export const observacionesMock: Observacion[] = [];
export const notasMock: Nota[] = [];
export const resolucionesMock: Resolucion[] = [];
export const citacionesMock: Citacion[] = [];

export const BLOQUES = [
  { id: "Bloque 1", label: "Bloque 1", horario: "08:00–08:45" },
  { id: "Bloque 2", label: "Bloque 2", horario: "08:45–09:30" },
  { id: "Bloque 3", label: "Bloque 3", horario: "10:45–11:30" },
  { id: "Bloque 4", label: "Bloque 4", horario: "11:30–12:15" },
  { id: "Bloque 5", label: "Bloque 5", horario: "13:30–14:15" },
];

export const ASIGNATURAS = [
  "Matemática", "Lenguaje", "Ciencias", "Historia",
  "Educación Física", "Inglés", "Artes", "Tecnología",
];
