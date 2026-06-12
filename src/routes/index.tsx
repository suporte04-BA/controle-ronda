import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, session, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) navigate({ to: "/login", replace: true });
    else if (role === "admin") navigate({ to: "/admin", replace: true });
    else navigate({ to: "/app", replace: true });
  }, [loading, session, role, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080810" }}>
      <Loader2 className="w-8 h-8 animate-spin text-neon-cyan" />
    </div>
  );
}
