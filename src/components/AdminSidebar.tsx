import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  PlusSquare,
  Bell,
  BarChart3,
  Users,
  Building2,
  LogOut,
  Clock,
  FolderKanban,
  Tags,
  UserRoundCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const principal = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/registros", label: "Todos os Chamados (Pontos)", icon: Ticket },
  { to: "/admin/chamados/novo", label: "Novo Chamado", icon: PlusSquare },
];

const administracao = [
  { to: "/admin/lembretes", label: "Lembretes", icon: Bell },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/setores", label: "Setores", icon: Building2 },
  { to: "/admin/categorias", label: "Categorias", icon: Tags },
  { to: "/admin/projetos", label: "Projetos", icon: FolderKanban },
];

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, setDevViewRole, signOut } = useAuth();

  const renderItem = (it: { to: string; label: string; icon: any; exact?: boolean }) => {
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
  };

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2">
        <img src="/logo.png" className="h-12 object-contain" alt="BA Elétrica" />
        <div>
          <div className="text-sm font-semibold text-white">BA Elétrica</div>
          <div className="text-[11px] text-sidebar-foreground/60">Administração</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-2 font-semibold">
            Menu Principal
          </div>
          <div className="space-y-1">{principal.map(renderItem)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-3 mb-2 font-semibold">
            Administração
          </div>
          <div className="space-y-1">{administracao.map(renderItem)}</div>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 mb-2">
          <div className="text-sm text-white font-medium truncate">{profile?.nome ?? "Admin"}</div>
          <div className="text-[11px] text-sidebar-foreground/60 truncate">{profile?.email}</div>
        </div>
        <button
          onClick={() => setDevViewRole("user")}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors mb-1"
        >
          <UserRoundCog className="w-4 h-4" />
          Visão Funcionário (Dev)
        </button>
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
