import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — BA Elétrica" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { session, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (session) navigate({ to: role === "admin" ? "/admin" : "/app", replace: true });
  }, [session, role, loading, navigate]);

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const emailLimpo = email.trim().toLowerCase().replace(/,$/, "");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
      if (error) toast.error("Falha no login", { description: error.message });
      else toast.success("Bem-vindo de volta!");
    } catch (error) {
      toast.error("Erro de conexão", {
        description: "Não foi possível conectar ao backend agora. Verifique a internet e tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase().replace(/,$/, ""),
        password: senha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { nome },
        },
      });
      if (error) toast.error("Falha no cadastro", { description: error.message });
      else toast.success("Cadastro realizado! Faça login para acessar.");
    } catch (error) {
      toast.error("Erro de conexão", {
        description: "Não foi possível conectar ao backend agora. Verifique a internet e tente novamente.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="fixed top-3 right-3 z-50">
        <ThemeToggle size="sm" />
      </div>
      {/* Neon glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-neon-cyan/5 blur-3xl animate-glow-breathe pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-neon-violet/5 blur-3xl animate-glow-breathe pointer-events-none" style={{ animationDelay: "1.5s" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <img src="/logo.png" className="h-14 object-contain mx-auto drop-shadow-[0_0_20px_rgba(0,240,255,0.3)]" alt="BA Elétrica" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            BA Elétrica
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de Ronda</p>
        </div>

        <div className="glass-strong rounded-2xl p-6 glow-cyan">
          <Tabs defaultValue="entrar">
            <TabsList className="grid grid-cols-2 mb-5 w-full bg-secondary/50">
              <TabsTrigger value="entrar" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_10px_rgba(0,240,255,0.15)]">Entrar</TabsTrigger>
              <TabsTrigger value="cadastrar" className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_10px_rgba(0,240,255,0.15)]">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={entrar} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-muted-foreground text-xs uppercase tracking-wider">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="text-muted-foreground text-xs uppercase tracking-wider">Senha</Label>
                  <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                    className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all" />
                </div>
                <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-200" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastrar">
              <form onSubmit={cadastrar} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-muted-foreground text-xs uppercase tracking-wider">Nome completo</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)}
                    className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2" className="text-muted-foreground text-xs uppercase tracking-wider">E-mail</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha2" className="text-muted-foreground text-xs uppercase tracking-wider">Senha</Label>
                  <Input id="senha2" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
                    className="bg-secondary/50 border-border-subtle focus:border-primary/40 focus:ring-primary/20 focus:shadow-[0_0_12px_rgba(0,240,255,0.1)] transition-all" />
                </div>
                <Button type="submit" className="w-full h-11 bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all duration-200" disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-6">
          Sistema de Controle de Ronda — BA Elétrica
        </p>
      </div>
    </div>
  );
}
