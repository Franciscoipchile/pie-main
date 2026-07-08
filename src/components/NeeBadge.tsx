import React from 'react';

// Definimos los estilos directamente para evitar dependencias externas que puedan fallar
const ESTILOS: Record<string, string> = {
  TEL: "bg-purple-100 text-purple-800",
  TDAH: "bg-blue-100 text-blue-800",
  DEA: "bg-amber-100 text-amber-800",
  TEA: "bg-indigo-100 text-indigo-800",
  DEFAULT: "bg-slate-100 text-slate-800"
};

export function NeeBadge({ type }: { type: string }) {
  // Aseguramos que 'type' exista y buscamos su estilo, sino usamos el default
  const estilo = ESTILOS[type as keyof typeof ESTILOS] || ESTILOS.DEFAULT;

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${estilo}`}>
      {type || "S/N"}
    </span>
  );
}