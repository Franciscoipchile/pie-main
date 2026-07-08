// app.alumnos.tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/alumnos")({
  component: () => <Outlet />, // Solo deja pasar al hijo
});