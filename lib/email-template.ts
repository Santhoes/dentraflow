/**
 * Simple HTML email template for DentraFlow. Uses tables and inline styles for compatibility.
 * Optional CTA button and footer link.
 */

export interface EmailTemplateOptions {
  /** Greeting line, e.g. "Hi," */
  greeting?: string;
  /** Main body HTML (paragraphs, lists). Keep simple: <p>, <strong>, <br /> */
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
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dentraflow.com").replace(/\/$/, "");

  const buttonHtml = button
    ? `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 8px; background-color: #0d9488;">
          <a href="${button.url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${button.text}
          </a>
        </td>
      </tr>
    </table>
  `
    : "";

  const linkHtml = link
    ? `<p style="margin: 16px 0 0; font-size: 14px;"><a href="${link.url}" style="color: #0d9488; text-decoration: underline;">${link.text}</a></p>`
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
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
              <div style="margin: 0 0 24px; font-size: 15px;">
                ${body}
              </div>
              ${buttonHtml}
              ${linkHtml}
              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b;">${footer}</p>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
          <a href="${baseUrl}" style="color: #94a3b8; text-decoration: none;">DentraFlow</a> — AI Dental Receptionist
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
