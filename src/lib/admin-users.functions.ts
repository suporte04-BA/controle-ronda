import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { nome: string; email: string; password: string; setor_id?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    if (!email || !data.password || data.password.length < 6) {
      throw new Error("E-mail e senha (mínimo 6 caracteres) obrigatórios.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error || !created.user) throw new Error(error?.message || "Falha ao criar usuário.");

    const uid = created.user.id;
    // garantir profile (trigger faz, mas reforçamos setor)
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      nome: data.nome || email,
      email,
      setor_id: data.setor_id ?? null,
    });
    return { id: uid };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (prof?.email?.toLowerCase() === SUPPORT_EMAIL) {
      throw new Error("Esta conta é protegida e não pode ser removida.");
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
