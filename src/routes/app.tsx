import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmployeeBottomNav } from "@/components/EmployeeBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/app")({
  component: EmployeeLayout,
});

function EmployeeLayout() {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
    else if (role === "admin") navigate({ to: "/admin", replace: true });
  }, [loading, session, role, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 no-print glass-strong border-b border-border-subtle">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="logo-container !p-1 !rounded-lg">
              <img src="/logo.png" alt="BA Elétrica" className="h-8 w-auto object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground leading-tight">BA Elétrica</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Controle de Ronda</div>
            </div>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>
      <div className="max-w-md mx-auto">
        <Outlet />
      </div>
      <EmployeeBottomNav />
    </div>
  );
}
