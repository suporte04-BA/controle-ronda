import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ShieldCheck, Users, Building2, LogOut, UserRoundCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/registros", label: "Controle de Ronda", icon: ShieldCheck },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/setores", label: "Setores", icon: Building2 },
];

const SUPPORT_EMAIL = "suporte04@baeletrica.com";

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, baseRole, devViewRole, setDevViewRole, signOut } = useAuth();

  const canToggleView =
    baseRole === "admin" || profile?.email?.toLowerCase() === SUPPORT_EMAIL;
  const currentView = devViewRole ?? baseRole;

  return (
    <aside className="no-print w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
        <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
        <div>
          <div className="text-sm font-semibold text-white">BA Elétrica</div>
          <div className="text-[11px] text-sidebar-foreground/60">Controle de Ronda</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 mb-2">
          <div className="text-sm text-white font-medium truncate">{profile?.nome ?? "Admin"}</div>
          <div className="text-[11px] text-sidebar-foreground/60 truncate">{profile?.email}</div>
        </div>
        {canToggleView && (
          <button
            onClick={() => setDevViewRole(currentView === "admin" ? "user" : "admin")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors mb-1"
          >
            <UserRoundCog className="w-4 h-4" />
            {currentView === "admin" ? "Alternar para Visão Vigilante" : "Alternar para Visão Administrador"}
          </button>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
