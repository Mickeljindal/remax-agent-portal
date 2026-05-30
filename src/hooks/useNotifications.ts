import { supabase } from "@/integrations/supabase/client";

interface SendNotificationParams {
  type: "course_assigned" | "course_completed" | "course_reminder" | "agent_signup" | "agent_activated";
  recipientEmail: string;
  recipientName?: string;
  recipientAgentId?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
  notifyAdmins?: boolean;
  adminSubject?: string;
  adminBody?: string;
}

/**
 * Hook to send email notifications via the send-notification edge function.
 * Handles both agent and admin notifications.
 */
export function useNotifications() {
  const sendNotification = async (params: SendNotificationParams) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: params,
      });

      if (error) {
        console.error("Notification error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err: any) {
      console.error("Notification error:", err);
      return { success: false, error: err.message };
    }
  };

  // Pre-built notification templates
  const notifyCourseAssigned = async (
    agentEmail: string,
    agentName: string,
    agentId: string,
    courseTitle: string,
    dueDate?: string
  ) => {
    const dueLine = dueDate ? `\n\nDue date: ${new Date(dueDate).toLocaleDateString("en-CA", { dateStyle: "long" })}` : "";

    return sendNotification({
      type: "course_assigned",
      recipientEmail: agentEmail,
      recipientName: agentName,
      recipientAgentId: agentId,
      subject: `New Course Assigned: ${courseTitle}`,
      body: `Hi ${agentName},\n\nA new course has been assigned to you: "${courseTitle}".${dueLine}\n\nPlease log in to the portal to start the course.\n\nBest regards,\nRE/MAX Excellence Training Team`,
      metadata: { courseTitle, dueDate },
      notifyAdmins: false,
    });
  };

  const notifyCourseCompleted = async (
    agentEmail: string,
    agentName: string,
    agentId: string,
    courseTitle: string,
    watchTimeSeconds: number
  ) => {
    const watchTime = formatWatchTime(watchTimeSeconds);

    return sendNotification({
      type: "course_completed",
      recipientEmail: agentEmail,
      recipientName: agentName,
      recipientAgentId: agentId,
      subject: `🎉 Course Completed: ${courseTitle}`,
      body: `Congratulations ${agentName}!\n\nYou have successfully completed "${courseTitle}".\n\nTotal watch time: ${watchTime}\n\nYour certificate of completion is now available in the portal.\n\nKeep up the great work!\nRE/MAX Excellence Training Team`,
      metadata: { courseTitle, watchTimeSeconds },
      notifyAdmins: true,
      adminSubject: `Agent Completed Course: ${courseTitle}`,
      adminBody: `${agentName} has completed the course "${courseTitle}".\n\nWatch time: ${watchTime}\n\nView full analytics in the admin portal.`,
    });
  };

  const notifyAgentSignup = async (agentEmail: string, agentName: string, recoNumber: string) => {
    return sendNotification({
      type: "agent_signup",
      recipientEmail: agentEmail,
      recipientName: agentName,
      subject: "Welcome to RE/MAX Excellence Portal",
      body: `Hi ${agentName},\n\nThank you for signing up for the RE/MAX Excellence Agent Portal.\n\nYour account is pending activation by an administrator. You will receive an email once your account is approved.\n\nRECO Number: ${recoNumber}\n\nBest regards,\nRE/MAX Excellence Team`,
      metadata: { recoNumber },
      notifyAdmins: true,
      adminSubject: `New Agent Signup: ${agentName}`,
      adminBody: `A new agent has signed up and is pending activation.\n\nName: ${agentName}\nEmail: ${agentEmail}\nRECO: ${recoNumber}\n\nPlease review and activate their account in the admin panel.`,
    });
  };

  const notifyAgentActivated = async (agentEmail: string, agentName: string) => {
    return sendNotification({
      type: "agent_activated",
      recipientEmail: agentEmail,
      recipientName: agentName,
      subject: "Your Account Has Been Activated!",
      body: `Hi ${agentName},\n\nGreat news! Your RE/MAX Excellence Portal account has been activated.\n\nYou can now log in and access all portal features including:\n• Training courses & certifications\n• Pre-construction listings\n• Room booking\n• Vendor directory\n• And more!\n\nLog in now to get started.\n\nBest regards,\nRE/MAX Excellence Team`,
    });
  };

  const notifyCourseReminder = async (
    agentEmail: string,
    agentName: string,
    agentId: string,
    courseTitle: string,
    progressPercent: number,
    dueDate?: string
  ) => {
    const dueLine = dueDate
      ? `\n\nThis course is due by ${new Date(dueDate).toLocaleDateString("en-CA", { dateStyle: "long" })}.`
      : "";

    return sendNotification({
      type: "course_reminder",
      recipientEmail: agentEmail,
      recipientName: agentName,
      recipientAgentId: agentId,
      subject: `Reminder: Continue "${courseTitle}"`,
      body: `Hi ${agentName},\n\nJust a friendly reminder to continue your course: "${courseTitle}".\n\nYour current progress: ${progressPercent}%${dueLine}\n\nLog in to the portal to pick up where you left off.\n\nBest regards,\nRE/MAX Excellence Training Team`,
      metadata: { courseTitle, progressPercent, dueDate },
    });
  };

  return {
    sendNotification,
    notifyCourseAssigned,
    notifyCourseCompleted,
    notifyAgentSignup,
    notifyAgentActivated,
    notifyCourseReminder,
  };
}

function formatWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
