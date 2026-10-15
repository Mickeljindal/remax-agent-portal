/**
 * True when a URL hash comes from a Supabase-hosted recovery link
 * (e.g. `/#access_token=...&type=recovery`). Those links are sent by the
 * Supabase dashboard ("Send password recovery") or the legacy
 * resetPasswordForEmail flow, and land on the Supabase "Site URL".
 */
export const isRecoveryHash = (hash: string): boolean =>
  new URLSearchParams(hash.replace(/^#/, "")).get("type") === "recovery";
