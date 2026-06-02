import { supabase } from "@/integrations/supabase/client";

/**
 * Base URL of the Node backend (KloudBean). The server serves both the React
 * build and the /api endpoints, so this is empty (same origin) by default.
 * Override with VITE_UPLOAD_SERVER_URL only when running a separate host.
 */
const SERVER_BASE =
  (import.meta.env.VITE_UPLOAD_SERVER_URL as string | undefined)?.replace(/\/$/, "") || "";

interface ServerApiResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Calls a same-origin server API endpoint (the ported edge-function logic).
 * Automatically attaches the current Supabase access token when available.
 */
export async function callServerApi<T = unknown>(
  endpoint: string,
  body: unknown,
  options: { auth?: boolean } = {}
): Promise<ServerApiResult<T>> {
  const { auth = true } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }

  try {
    const res = await fetch(`${SERVER_BASE}/api/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* non-JSON response */
    }

    if (!res.ok) {
      const message =
        (json as { error?: string } | null)?.error || `Request failed (${res.status}).`;
      return { data: null, error: message };
    }

    const errInBody = (json as { error?: string } | null)?.error;
    if (errInBody) return { data: null, error: errInBody };

    return { data: json as T, error: null };
  } catch (e) {
    return {
      data: null,
      error:
        e instanceof Error ? e.message : "Network error — could not reach the server.",
    };
  }
}
