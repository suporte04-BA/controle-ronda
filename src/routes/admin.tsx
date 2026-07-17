import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
    else if (role === "user") navigate({ to: "/app", replace: true });
  }, [loading, session, role, navigate]);

  if (loading || !session || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto relative">
        <header className="sticky top-0 z-30 no-print glass-strong border-b border-border-subtle lg:hidden">
          <div className="flex items-center justify-between px-4 py-2.5">
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
        <div className="fixed top-3 right-3 z-50 no-print hidden lg:block">
          <ThemeToggle size="sm" />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
