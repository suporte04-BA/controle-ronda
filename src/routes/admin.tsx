import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminSidebar } from "@/components/AdminSidebar";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
    else if (role !== "admin") navigate({ to: "/app", replace: true });
  }, [loading, session, role, navigate]);

  if (loading || !session || role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080810" }}>
        <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex" style={{
      background: "radial-gradient(ellipse at 80% 20%, rgba(0,240,255,0.03) 0%, transparent 40%), #080810",
    }}>
      <AdminSidebar />
      <main className="flex-1 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
