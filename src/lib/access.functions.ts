import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPPORT_EMAIL = "suporte04@baeletrica.com";
const SUPPORT_PASSWORD = "sjr183039";

function normalizeSupportEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized === "suporte04@baeletrica.com.br" ? SUPPORT_EMAIL : normalized;
}

async function ensureAccessForUser(userId: string, email: string, nome?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const safeEmail = normalizeSupportEmail(email);
  const role = safeEmail === SUPPORT_EMAIL ? "admin" : "user";

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email: safeEmail,
    nome: nome || safeEmail,
  });

  await supabaseAdmin.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role" }
  );

  return { role };
}

export const bootstrapSupportAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => input)
  .handler(async ({ data }) => {
    const email = normalizeSupportEmail(data.email);
    if (email !== SUPPORT_EMAIL || data.password !== SUPPORT_PASSWORD) {
      return { ok: false };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = existing.users.find((u) => normalizeSupportEmail(u.email ?? "") === SUPPORT_EMAIL);

    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: SUPPORT_EMAIL,
        password: SUPPORT_PASSWORD,
        email_confirm: true,
        user_metadata: { nome: "Suporte BA Elétrica" },
      });
      if (error) throw new Error(error.message);
      user = created.user;
    }

    await ensureAccessForUser(user.id, SUPPORT_EMAIL, "Suporte BA Elétrica");
    return { ok: true };
  });

export const syncCurrentUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Record<string, unknown>;
    const email = String(claims.email ?? "");
    const nome = typeof claims.user_metadata === "object" && claims.user_metadata !== null
      ? (claims.user_metadata as Record<string, unknown>).nome as string | undefined
      : undefined;
    return ensureAccessForUser(context.userId, email, nome);
  });