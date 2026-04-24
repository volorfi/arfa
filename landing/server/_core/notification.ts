/**
 * notification.ts — Owner notifications via Resend email
 * MIGRATION: was Manus WebDevService/SendNotification
 * NOW: sends email via Resend (https://resend.com) — free tier = 3000 emails/month
 * Set RESEND_API_KEY and OWNER_EMAIL in your .env
 */
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

export type NotificationPayload = { title: string; content: string };

export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  if (!payload.title?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "title is required" });
  if (!payload.content?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "content is required" });

  if (!ENV.resendApiKey || !ENV.ownerEmail) {
    // Graceful degradation — log to console if Resend not configured yet
    console.log("[Notification] (not sent — RESEND_API_KEY/OWNER_EMAIL not set)");
    console.log(`  Title: ${payload.title}`);
    console.log(`  Content: ${payload.content.slice(0, 200)}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ENV.resendApiKey}` },
      body: JSON.stringify({
        from:    "ARFA Notifications <notifications@arfa.markets>",
        to:      [ENV.ownerEmail],
        subject: payload.title,
        text:    payload.content,
      }),
    });
    if (!res.ok) {
      console.warn("[Notification] Resend failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Notification] Error:", err);
    return false;
  }
}
