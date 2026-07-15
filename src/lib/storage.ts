import { supabase } from "@/integrations/supabase/client";

const MARKER = "/fotos_ponto/";

export function extractFotoPath(value: string): string {
  if (!value) return value;
  const idx = value.indexOf(MARKER);
  return idx >= 0 ? value.substring(idx + MARKER.length) : value;
}

export async function getSignedFotoUrl(value: string, expiresInSec = 3600): Promise<string | null> {
  const path = extractFotoPath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("fotos_ponto").createSignedUrl(path, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}

export async function getSignedFotoUrls(values: string[], expiresInSec = 3600): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = Array.from(new Set(values.filter(Boolean)));
  await Promise.all(
    unique.map(async (v) => {
      const u = await getSignedFotoUrl(v, expiresInSec);
      if (u) result.set(v, u);
    })
  );
  return result;
}
