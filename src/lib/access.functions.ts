import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SUPPORT_EMAIL } from "@/lib/config";

function normalizeSupportEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  // Normaliza variante ".com" para ".com.br" (usuarios podem registrar sem .br)
  return normalized === "suporte04@baeletrica.com" ? SUPPORT_EMAIL : normalized;
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

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

  return { role };
}

export const syncCurrentUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const claims = context.claims as Record<string, unknown>;
    const email = String(claims.email ?? "");
    const nome =
      typeof claims.user_metadata === "object" && claims.user_metadata !== null
        ? ((claims.user_metadata as Record<string, unknown>).nome as string | undefined)
        : undefined;
    return ensureAccessForUser(context.userId, email, nome);
  });
