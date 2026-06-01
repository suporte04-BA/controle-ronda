import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { EmployeeBottomNav } from "@/components/EmployeeBottomNav";

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
      <div className="max-w-md mx-auto">
        <Outlet />
      </div>
      <EmployeeBottomNav />
    </div>
  );
}
