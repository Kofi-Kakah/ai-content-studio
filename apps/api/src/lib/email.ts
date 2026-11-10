import { Resend } from "resend";
import { emailEnabled, env } from "../env.js";

let resend: Resend | null = null;
if (emailEnabled) {
  resend = new Resend(env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(to: string, name: string | null, resetUrl: string) {
  if (!resend) {
    // Dev fallback — no Resend key configured. Log the link so local flows work.
    console.log("\n📧 [dev] password reset email");
    console.log(`   to:      ${to}`);
    console.log(`   subject: Reset your AI Content Studio password`);
    console.log(`   link:    ${resetUrl}\n`);
    return;
  }

  const firstName = name?.split(" ")[0] || "there";

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your AI Content Studio password",
    html: renderResetEmail(firstName, resetUrl),
    text: `Hi ${firstName},\n\nWe received a request to reset your password. Open the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 48 hours. If you didn't request this, you can safely ignore this email.\n\n— The AI Content Studio team`,
  });
}

function renderResetEmail(firstName: string, resetUrl: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;padding:40px;">
          <tr><td align="center" style="padding-bottom:8px;">
            <div style="font-size:20px;font-weight:700;color:#18181b;">✦ AI Content Studio</div>
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <div style="font-size:14px;color:#71717a;">Password reset request</div>
          </td></tr>
          <tr><td style="padding-bottom:24px;">
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0 0 12px;">Hi ${firstName},</p>
            <p style="font-size:15px;line-height:22px;color:#3f3f46;margin:0;">
              We received a request to reset your password. Click the button below to choose a new one.
            </p>
          </td></tr>
          <tr><td align="center" style="padding-bottom:24px;">
            <a href="${resetUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:999px;">
              Reset password
            </a>
          </td></tr>
          <tr><td>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:0 0 8px;">
              This link expires in 48 hours. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <p style="font-size:13px;line-height:20px;color:#a1a1aa;margin:0;word-break:break-all;">
              Or paste this link into your browser: ${resetUrl}
            </p>
          </td></tr>
        </table>
        <div style="font-size:12px;color:#a1a1aa;padding-top:24px;">
          © ${new Date().getFullYear()} AI Content Studio
        </div>
      </td></tr>
    </table>
  </body>
</html>`;
}
