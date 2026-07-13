import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPPORT_EMAIL = "suporte04@baeletrica.com";

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
  .inputValidator((d: { nome: string; email: string; password: string; setor_id?: string | null; isAdmin?: boolean }) => d)
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
    if (data.isAdmin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" });
    }
    return { id: uid };
  });

export const adminBulkCreateUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { users: { nome: string; email: string; password: string; setor_id?: string | null; isAdmin?: boolean }[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];

    for (const u of data.users) {
      const email = u.email.trim().toLowerCase();
      if (!email || !u.password || u.password.length < 6) {
        results.push({ email: u.email, ok: false, error: "E-mail e senha (mínimo 6 caracteres) obrigatórios." });
        continue;
      }

      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nome: u.nome },
      });
      if (error || !created.user) {
        results.push({ email, ok: false, error: error?.message || "Falha ao criar usuário." });
        continue;
      }

      const uid = created.user.id;
      await supabaseAdmin.from("profiles").upsert({
        id: uid,
        nome: u.nome || email,
        email,
        setor_id: u.setor_id ?? null,
      });
      if (u.isAdmin) {
        await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" });
      }
      results.push({ email, ok: true, id: uid });
    }

    return results;
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
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
