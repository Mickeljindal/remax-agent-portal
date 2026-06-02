import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SignupRequest {
  recoNumber: string;
  fullName: string;
  email: string;       // agent's real contact email
  password: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { recoNumber, fullName, email, password }: SignupRequest = await req.json();

    if (!recoNumber?.trim() || !password) {
      throw new Error("RECO number and password are required.");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const loginEmail = `${recoNumber.toLowerCase().replace(/\s+/g, "")}@agent.portal`;

    // Create the auth user with email auto-confirmed (no confirmation email needed)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: loginEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
        reco_number: recoNumber,
        contact_email: email || null,
      },
    });

    if (createErr) {
      const msg = createErr.message || "";
      if (msg.toLowerCase().includes("already") || (createErr as { code?: string }).code === "email_exists") {
        throw new Error("This RECO number is already registered. Please log in instead.");
      }
      throw new Error(createErr.message);
    }

    const userId = created.user?.id;
    if (!userId) throw new Error("Failed to create user.");

    // Create the agent profile (inactive — requires admin activation)
    const { error: insertError } = await supabase.from("agents").insert({
      user_id: userId,
      reco_number: recoNumber,
      full_name: fullName || null,
      email: email || null,
      is_active: false,
    });
    if (insertError) {
      // Roll back the auth user so they can retry cleanly
      await supabase.auth.admin.deleteUser(userId);
      if (insertError.message.includes("duplicate") || insertError.code === "23505") {
        throw new Error("This RECO number is already registered. Please log in instead.");
      }
      throw new Error(`Failed to create profile: ${insertError.message}`);
    }

    // Assign the 'agent' role
    await supabase.from("user_roles").insert({ user_id: userId, role: "agent" });

    // Notify admins of the new signup (in-app), best-effort
    try {
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      for (const r of adminRoles || []) {
        const { data: adminAgent } = await supabase.from("agents").select("id").eq("user_id", r.user_id).single();
        if (adminAgent) {
          await supabase.from("in_app_notifications").insert({
            agent_id: adminAgent.id,
            title: `New agent signup: ${fullName || recoNumber}`,
            body: `RECO ${recoNumber} is pending activation.`,
            type: "system",
            link: "/admin",
          });
        }
      }
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: true, message: "Account created. Pending admin activation." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-agent-profile:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
