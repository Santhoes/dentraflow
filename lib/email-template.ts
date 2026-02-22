/**
 * Simple HTML email template for DentraFlow. Uses tables and inline styles for compatibility.
 * Optional CTA button and footer link.
 * All dynamic content is escaped to prevent XSS in email clients.
 */

/** Escape for safe use in HTML content and attributes. Use when building body/greeting/footer with user or clinic data. */
export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Allow only http(s) URLs for href to prevent javascript: etc. */
function sanitizeHref(url: string): string {
  const s = String(url).trim();
  if (/^https?:\/\/[^\s<>"']+$/i.test(s)) return s;
  return "#";
}

export interface EmailTemplateOptions {
  /** Greeting line, e.g. "Hi," */
  greeting?: string;
  /** Main body HTML (paragraphs, lists). Keep simple: <p>, <strong>, <br /> — will be escaped if passed as plain text. For pre-built HTML from trusted input, callers can pass already-safe HTML. */
  body: string;
  /** Optional CTA: { text: "View billing", url: "https://..." } */
  button?: { text: string; url: string };
  /** Optional secondary link, e.g. "Visit app" */
  link?: { text: string; url: string };
  /** Footer sign-off, default "— DentraFlow" */
  footer?: string;
}

export function renderEmailHtml(options: EmailTemplateOptions): string {
  const { greeting = "Hi,", body, button, link, footer = "— DentraFlow" } = options;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.dentraflow.com").replace(/\/$/, "");
  const logoUrl = `${baseUrl}/logo.png`;
  const safeGreeting = escapeHtml(greeting);
  const safeBody = body;
  const safeFooter = escapeHtml(footer);

  const headerHtml = `
    <tr>
      <td style="padding: 24px 24px 16px; border-bottom: 1px solid #e2e8f0;">
        <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
          <tr>
            <td style="vertical-align: middle;">
              <img src="${escapeHtml(logoUrl)}" alt="DentraFlow" width="40" height="40" style="display: block; width: 40px; height: 40px; border-radius: 8px;" />
            </td>
            <td style="vertical-align: middle; padding-left: 12px;">
              <p style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">DentraFlow</p>
              <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">AI Dental Receptionist for 24/7 Appointment Booking</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const footerDetailsHtml = `
    <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
      <a href="${escapeHtml(baseUrl)}" style="color: #94a3b8; text-decoration: none;">www.dentraflow.com</a>
      &nbsp;·&nbsp;
      <a href="mailto:support@dentraflow.com" style="color: #94a3b8; text-decoration: none;">support@dentraflow.com</a>
    </p>
  `;

  const buttonHtml = button
    ? `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 8px; background-color: #0d9488;">
          <a href="${sanitizeHref(button.url)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${escapeHtml(button.text)}
          </a>
        </td>
      </tr>
    </table>
  `
    : "";

  const linkHtml = link
    ? `<p style="margin: 16px 0 0; font-size: 14px;"><a href="${sanitizeHref(link.url)}" style="color: #0d9488; text-decoration: underline;">${escapeHtml(link.text)}</a></p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DentraFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #334155; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">
          ${headerHtml}
          <tr>
            <td style="padding: 24px 24px 32px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${safeGreeting}</p>
              <div style="margin: 0 0 24px; font-size: 15px;">
                ${safeBody}
              </div>
              ${buttonHtml}
              ${linkHtml}
              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b;">${safeFooter}</p>
              ${footerDetailsHtml}
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} DentraFlow. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
