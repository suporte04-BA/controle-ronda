import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPPORT_EMAIL = "suporte04@baeletrica.com.br";

export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((d: { nomeOuEmail: string }) => d)
  .handler(async ({ data }) => {
    const input = data.nomeOuEmail.trim();
    if (input.includes("@")) return { email: input.toLowerCase() };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const normalize = (s: string) =>
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const inputNorm = normalize(input);

    const { data: profs } = await supabaseAdmin.from("profiles").select("email, nome");

    const match = (profs ?? []).find((p: any) => normalize(p.nome) === inputNorm);
    if (!match?.email) throw new Error("Usuário não encontrado. Use o e-mail para entrar.");
    return { email: match.email.toLowerCase() };
  });

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

export const adminBulkCreateUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      setores: { nome: string }[];
      usuarios: {
        nome: string;
        email: string;
        password: string;
        setor_nome: string;
        role: "admin" | "user";
      }[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: {
      nome: string;
      email: string;
      password: string;
      ok: boolean;
      error?: string;
    }[] = [];

    // 1. Criar setores
    const setorMap = new Map<string, string>();
    for (const s of data.setores) {
      const existing = await supabaseAdmin
        .from("setores")
        .select("id")
        .eq("nome", s.nome)
        .maybeSingle();
      if (existing.data) {
        setorMap.set(s.nome, existing.data.id);
      } else {
        const { data: created } = await supabaseAdmin
          .from("setores")
          .insert({ nome: s.nome })
          .select("id")
          .single();
        if (created) setorMap.set(s.nome, created.id);
      }
    }

    // 2. Criar usuarios
    for (const u of data.usuarios) {
      try {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { nome: u.nome },
        });
        if (error || !created.user) {
          results.push({
            nome: u.nome,
            email: u.email,
            password: u.password,
            ok: false,
            error: error?.message || "Falha ao criar",
          });
          continue;
        }

        const uid = created.user.id;
        const setorId = setorMap.get(u.setor_nome) ?? null;

        // Upsert profile
        await supabaseAdmin.from("profiles").upsert({
          id: uid,
          nome: u.nome,
          email: u.email,
          setor_id: setorId,
        });

        // Upsert role
        await supabaseAdmin.from("user_roles").upsert({
          user_id: uid,
          role: u.role,
        });

        results.push({ nome: u.nome, email: u.email, password: u.password, ok: true });
      } catch (e: any) {
        results.push({
          nome: u.nome,
          email: u.email,
          password: u.password,
          ok: false,
          error: e?.message || "Erro desconhecido",
        });
      }
    }

    return results;
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
