import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resend = new Resend(key);
  }
  return resend;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  await getResend().emails.send({
    from:
      process.env.EMAIL_FROM || "Slate <notifications@yourdomain.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
