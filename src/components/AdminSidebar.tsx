import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, ShieldCheck, Users, Building2, LogOut, UserRoundCog, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/registros", label: "Controle de Ronda", icon: ShieldCheck },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/setores", label: "Setores", icon: Building2 },
];

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

export function AdminSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { profile, baseRole, devViewRole, setDevViewRole, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const canToggleView =
    baseRole === "admin" || profile?.email?.toLowerCase() === SUPPORT_EMAIL;
  const currentView = devViewRole ?? baseRole;

  useEffect(() => {
    if (profile?.foto_url) {
      supabase.storage.from("avatars").createSignedUrl(profile.foto_url, 3600)
        .then(({ data }) => setAvatarUrl(data?.signedUrl ?? null));
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.foto_url]);

  return (
    <aside className="no-print w-60 lg:w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      <div className="px-5 pt-6 pb-4 border-b border-sidebar-border flex flex-col items-center gap-2 bg-transparent">
        <div className="relative">
          <img
            src="/logo.png"
            alt="BA Elétrica"
            className="h-20 lg:h-28 w-auto object-contain drop-shadow-[0_0_24px_rgba(0,240,255,0.25)]"
            style={{ background: "transparent" }}
          />
        </div>
        <div className="text-center">
          <div className="text-base font-semibold text-white tracking-wide">BA Elétrica</div>
          <div className="text-xs text-sidebar-foreground/50">Controle de Ronda</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1.5">
        {items.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm lg:text-base font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[0_0_12px_rgba(0,240,255,0.12)]"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "text-neon-cyan")} />
              <span>{it.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_6px_rgba(0,240,255,0.6)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 mb-2 flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-border-subtle flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-foreground/60 flex-shrink-0">
              <Camera className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-sm text-white font-medium truncate">{profile?.nome ?? "Admin"}</div>
            <div className="text-[11px] text-sidebar-foreground/40 truncate">{profile?.email}</div>
          </div>
        </div>
        <ThemeToggle className="w-full mb-1" />
        {canToggleView && (
          <button
            onClick={() => setDevViewRole(currentView === "admin" ? "user" : "admin")}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground transition-colors mb-1"
          >
            <UserRoundCog className="w-4 h-4" />
            {currentView === "admin" ? "Alternar para Visão Vigilante" : "Alternar para Visão Administrador"}
          </button>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
