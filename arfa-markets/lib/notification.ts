import { Resend } from "resend";
import { ENV } from "@/lib/env";

/**
 * Owner notifications via Resend. Ported from /server/_core/notification.ts;
 * original threw TRPCError on validation failures, but this project is
 * App Router REST — replaced with plain `Error` so callers can catch
 * and convert to NextResponse as needed.
 */

export type NotificationPayload = {
  title: string;
  content: string;
};

export class NotificationValidationError extends Error {
  readonly code = "BAD_REQUEST";
}

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;
const DEFAULT_FROM = "ARFA Research <noreply@arfa.global>";

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new NotificationValidationError("Notification title is required.");
  }
  if (!isNonEmptyString(input.content)) {
    throw new NotificationValidationError(
      "Notification content is required.",
    );
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new NotificationValidationError(
      `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    );
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new NotificationValidationError(
      `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    );
  }

  return { title, content };
};

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

/**
 * Dispatches a project-owner notification via Resend email.
 * Returns `true` if the email was accepted by Resend, `false` otherwise
 * (missing config or delivery error) — callers can treat it as best-effort.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL is not configured; dropping notification");
    return false;
  }

  const resend = getResend();
  if (!resend) {
    console.warn("[Notification] RESEND_API_KEY is not configured; dropping notification");
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: ENV.ownerEmail,
      subject: title,
      text: content,
    });

    if (error) {
      console.warn("[Notification] Resend rejected email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Resend request failed:", error);
    return false;
  }
}
