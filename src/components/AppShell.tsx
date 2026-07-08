import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  GraduationCap,
  MessageSquareWarning,
  FileSignature,
  FileText,
  LogOut,
  Sparkles,
  ScrollText,
  DoorOpen,
  ClipboardPlus,
  Network,
  UserCog,
  BookOpen,
  Bell,
  Send,
  Clock,
} from "lucide-react";
import { useAuth, type Role } from "@/store";
import { useCoordinacion } from "@/store/coordinacion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase"; // 1. Agregamos el import que faltaba de Supabase

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  roles?: Role[];
  hideForRoles?: Role[];
};

const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/mis-cursos", label: "Mis cursos", icon: BookOpen, roles: ["profesor"] },
  { to: "/app/alumnos-pie", label: "Alumnos PIE", icon: Users, roles: ["profesor"] },
  { to: "/app/alumnos", label: "Alumnos PIE", icon: Users, hideForRoles: ["profesor"] },
  
  { to: "/app/asistencia", label: "Asistencia", icon: ClipboardCheck, hideForRoles: ["encargada"] },
  
  { to: "/app/control-clases", label: "Control durante clases", icon: DoorOpen, roles: ["encargada", "admin"] },
  { to: "/app/intervenciones", label: "Intervenciones PIE", icon: ClipboardPlus, roles: ["encargada", "admin"] },
  { to: "/app/coordinacion", label: "Coordinación", icon: Network, roles: ["encargada", "admin"] },
  
  { to: "/app/notas", label: "Notas", icon: GraduationCap, hideForRoles: ["encargada"] },
  
  { to: "/app/anotaciones", label: "Anotaciones", icon: MessageSquareWarning },
  
  { to: "/app/resoluciones", label: "Resoluciones PIE", icon: FileSignature, hideForRoles: ["profesor", "encargada", "admin"] },
  { to: "/app/informes", label: "Informes y Citaciones", icon: FileText, hideForRoles: ["profesor", "encargada", "admin"] },
  
  { to: "/app/alertas", label: "Alertas y citaciones", icon: Bell, roles: ["profesor"] },
  { to: "/app/comunicacion", label: "Comunicación con PIE", icon: Send, roles: ["profesor"] },
  { to: "/app/usuarios", label: "Usuarios", icon: UserCog, roles: ["admin"] },
  // 2. Nueva ruta añadida para el Admin:
  { to: "/app/configuracion", label: "Configurar Horarios", icon: Clock, roles: ["admin"] },
  { to: "/app/log", label: "Log", icon: ScrollText, roles: ["admin"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const alertas = useCoordinacion((s) => s.alertas);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      logout();
      window.location.href = "/login";
    }
  };

  const visibleNav = nav.filter((n) => {
    if (user?.role && n.hideForRoles?.includes(user.role)) return false;
    if (!n.roles) return true;
    return user?.role && n.roles.includes(user.role);
  });

  const alertasSinLeer =
    user?.role === "profesor"
      ? alertas.filter((a) => a.profesor === user.name && !a.leida).length
      : 0;

  return (
    <div className="min-h-screen flex w-full bg-muted/30">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
        {/* LOGO ACTUALIZADO: AULA DIGITAL */}
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center gap-3">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-black tracking-tighter text-xs shadow-sm select-none">
            AD
          </div>
          <div className="flex flex-col leading-tight select-none">
            <span className="text-sm font-bold text-sidebar-foreground tracking-tight">
              Aula Digital
            </span>
            <span className="text-xs text-muted-foreground">
              Gestión Docente
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((item) => {
            const isActive = item.exact ? path === item.to : (path === item.to || path.startsWith(item.to + "/")) && (item.to !== "/app" || path === "/app");
            const Icon = item.icon;
            const showAlertBadge = item.to === "/app/alertas" && alertasSinLeer > 0;
            return (
              <Link key={item.to} to={item.to} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <span className="flex items-center gap-3">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                {showAlertBadge && <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">{alertasSinLeer}</Badge>}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-lg bg-primary-soft p-3 text-xs select-none">
            {/* Tarjeta decorativa inferior adaptada */}
            <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
              <Sparkles className="size-3.5" /> Aula Digital 2026
            </div>
            <p className="text-muted-foreground leading-snug">
              Ecosistema modular de gestión institucional escolar.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="hidden md:block"><h1 className="text-base font-semibold capitalize">{visibleNav.find((n) => (n.exact ? path === n.to : path.startsWith(n.to)))?.label ?? "Dashboard"}</h1></div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant={user?.role === "encargada" ? "default" : user?.role === "admin" ? "destructive" : "secondary"} className="h-5 text-[10px]">
                {user?.role === "encargada" ? "Encargada PIE" : user?.role === "admin" ? "Administrador" : "Profesor"}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="size-4" /> <span className="hidden sm:inline">Salir</span></Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}