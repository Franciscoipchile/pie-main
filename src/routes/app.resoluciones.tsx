import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { HardHat } from "lucide-react";

export const Route = createFileRoute("/app/resoluciones")({
  component: ResolucionesView,
});

function ResolucionesView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Resoluciones PIE</h2>
        <p className="text-sm text-muted-foreground">Atenciones, planes y seguimientos del programa.</p>
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[60vh]">
        <div className="size-20 rounded-full bg-primary-soft text-primary grid place-items-center">
          <HardHat className="size-10" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">En construcción</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Esta sección está siendo definida. Próximamente disponible.
          </p>
        </div>
      </Card>
    </div>
  );
}
