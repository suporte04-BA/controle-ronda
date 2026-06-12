import { Link, useRouterState } from "@tanstack/react-router";
import { Clock, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Bater Ponto", icon: Clock },
  { to: "/app/historico", label: "Histórico", icon: History },
  { to: "/app/perfil", label: "Perfil", icon: User },
] as const;

export function EmployeeBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/5 no-print">
      <ul className="grid grid-cols-3 max-w-md mx-auto">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center py-3 gap-1 text-xs transition-all duration-200",
                  active
                    ? "text-neon-cyan shadow-[0_-4px_12px_rgba(0,240,255,0.1)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110 drop-shadow-[0_0_6px_rgba(0,240,255,0.4)]")} />
                <span className="font-medium">{it.label}</span>
                {active && <div className="w-1 h-1 rounded-full bg-neon-cyan shadow-[0_0_4px_rgba(0,240,255,0.6)]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
