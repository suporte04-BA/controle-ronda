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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border no-print">
      <ul className="grid grid-cols-3 max-w-md mx-auto">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", active && "scale-110")} />
                <span className="font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
