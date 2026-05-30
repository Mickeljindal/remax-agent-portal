import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type:
    | "course_assigned"
    | "course_completed"
    | "course_reminder"
    | "agent_signup"
    | "agent_activated";
  recipientEmail: string;
  recipientName?: string;
  recipientAgentId?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
  // Also notify admins?
  notifyAdmins?: boolean;
  adminSubject?: string;
  adminBody?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL") || "noreply@remaxexcellence.ca";
    const portalName = Deno.env.get("PORTAL_NAME") || "RE/MAX Excellence Portal";

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload: NotificationRequest = await req.json();
    const {
      type,
      recipientEmail,
      recipientName,
      recipientAgentId,
      subject,
      body,
      metadata,
      notifyAdmins,
      adminSubject,
      adminBody,
    } = payload;

    // Log the notification
    const { data: notifRecord, error: insertError } = await supabase
      .from("email_notifications")
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        recipient_agent_id: recipientAgentId || null,
        notification_type: type,
        subject,
        body,
        metadata: metadata || {},
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to log notification:", insertError);
    }

    // Send email via Resend if API key is configured
    let emailSent = false;
    if (resendApiKey) {
      try {
        const htmlBody = buildHtmlEmail(subject, body, portalName);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${portalName} <${fromEmail}>`,
            to: [recipientEmail],
            subject,
            html: htmlBody,
          }),
        });

        if (res.ok) {
          emailSent = true;
          // Update status
          if (notifRecord?.id) {
            await supabase
              .from("email_notifications")
              .update({ status: "sent", sent_at: new Date().toISOString() })
              .eq("id", notifRecord.id);
          }
        } else {
          const errText = await res.text();
          console.error("Resend error:", errText);
          if (notifRecord?.id) {
            await supabase
              .from("email_notifications")
              .update({ status: "failed", error_message: errText })
              .eq("id", notifRecord.id);
          }
        }
      } catch (emailErr: any) {
        console.error("Email send error:", emailErr);
        if (notifRecord?.id) {
          await supabase
            .from("email_notifications")
            .update({ status: "failed", error_message: emailErr.message })
            .eq("id", notifRecord.id);
        }
      }
    } else {
      // No Resend key — mark as sent (logged only)
      console.log(`[NO RESEND KEY] Would send to ${recipientEmail}: ${subject}`);
      if (notifRecord?.id) {
        await supabase
          .from("email_notifications")
          .update({ status: "sent", sent_at: new Date().toISOString(), error_message: "No RESEND_API_KEY — logged only" })
          .eq("id", notifRecord.id);
      }
      emailSent = true;
    }

    // Notify admins if requested
    if (notifyAdmins) {
      const { data: adminSettings } = await supabase
        .from("admin_notification_settings")
        .select("admin_user_id, email_override");

      // Also get admin agents
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = adminRoles?.map((r) => r.user_id) || [];

      // Get admin emails
      const { data: adminAgents } = await supabase
        .from("agents")
        .select("email, full_name, user_id")
        .in("user_id", adminUserIds);

      for (const admin of adminAgents || []) {
        const adminEmail = admin.email;
        if (!adminEmail) continue;

        // Log admin notification
        await supabase.from("email_notifications").insert({
          recipient_email: adminEmail,
          recipient_name: admin.full_name,
          notification_type: type,
          subject: adminSubject || `[Admin] ${subject}`,
          body: adminBody || body,
          metadata: metadata || {},
          status: "pending",
        });

        // Send via Resend
        if (resendApiKey) {
          const htmlBody = buildHtmlEmail(
            adminSubject || `[Admin] ${subject}`,
            adminBody || body,
            portalName
          );
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
              },
              body: JSON.stringify({
                from: `${portalName} <${fromEmail}>`,
                to: [adminEmail],
                subject: adminSubject || `[Admin] ${subject}`,
                html: htmlBody,
              }),
            });
          } catch (e) {
            console.error("Admin email error:", e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, notificationId: notifRecord?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildHtmlEmail(subject: string, body: string, portalName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  <div style="background: #003DA5; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 20px;">${portalName}</h1>
  </div>
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
    <div style="color: #4b5563; line-height: 1.6;">${body.replace(/\n/g, "<br>")}</div>
  </div>
  <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
    This is an automated message from ${portalName}. Please do not reply directly.
  </p>
</body>
</html>`;
}
