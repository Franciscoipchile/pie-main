import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/store";

function AppLayout() {
  const hasHydrated = useAuth((s) => s.hasHydrated);
  const user = useAuth((s) => s.user);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
    return null;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    if (
      typeof window !== "undefined" &&
      useAuth.persist?.hasHydrated() &&
      !useAuth.getState().user
    ) {
      throw redirect({ to: "/" });
    }
  },
  component: AppLayout,
});
