import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'DockForm <noreply@dockform.com>';

function wrap(title: string, body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:8px;background:#1a3f8f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;">D</div>
        <span style="font-size:16px;font-weight:700;color:#111827;">DockForm</span>
      </div>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827;">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">This is an automated message from DockForm. Do not reply to this email.</p>
    </div>
  </div>
</div>
</body></html>`;
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.log(`[Email skipped — no RESEND_API_KEY] To: ${to} Subject: ${subject}`);
    return null;
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    console.log(`[Email sent] To: ${to} Subject: ${subject}`);
    return result;
  } catch (err) {
    console.error(`[Email failed] To: ${to}`, err);
    return null;
  }
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  const html = wrap('Welcome to DockForm!', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Your DockForm account has been created. Our team will review and activate your account shortly.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">You'll receive another email once your account is approved and ready to use.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, 'Welcome to DockForm', html);
}

export async function sendAccountApprovedEmail(to: string, fullName: string, plan: string) {
  const html = wrap('Your Account is Approved!', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Great news — your DockForm account has been approved and activated.</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">Plan: ${plan}</p>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">You can now log in and start creating forms, assigning audits, and managing your teams.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, 'Your DockForm Account is Approved', html);
}

export async function sendAccountSuspendedEmail(to: string, fullName: string) {
  const html = wrap('Account Suspended', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Your DockForm account has been suspended. If you believe this is an error, please contact the DockForm team.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, 'DockForm Account Suspended', html);
}

export async function sendFormAssignedEmail(to: string, fullName: string, formName: string, assignedBy: string, formLink?: string) {
  const html = wrap('New Form Assigned', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;"><strong>${assignedBy}</strong> has assigned you a new form:</p>
    <div style="margin:16px 0;padding:14px 18px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
      <p style="margin:0;font-size:15px;color:#1e40af;font-weight:700;">${formName}</p>
    </div>
    ${formLink ? `<div style="margin:16px 0;text-align:center;"><a href="${formLink}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Open Form</a></div>` : ''}
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Log in to DockForm to fill out this form.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, `New Form Assigned: ${formName}`, html);
}

export async function sendResponseSubmittedEmail(to: string, fullName: string, formName: string, submittedBy: string) {
  const html = wrap('New Response Submitted', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;"><strong>${submittedBy}</strong> has submitted a response to:</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
      <p style="margin:0;font-size:15px;color:#15803d;font-weight:700;">${formName}</p>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Log in to DockForm to review the response.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, `New Response: ${formName}`, html);
}

export async function sendFormDueReminderEmail(to: string, fullName: string, formName: string, dueDate: string, formLink?: string) {
  const html = wrap('Form Due — Action Required', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Your scheduled audit/checklist is due today:</p>
    <div style="margin:16px 0;padding:14px 18px;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:15px;color:#92400e;font-weight:700;">${formName}</p>
      <p style="margin:0;font-size:13px;color:#92400e;">Due: ${dueDate}</p>
    </div>
    ${formLink ? `<div style="margin:16px 0;text-align:center;"><a href="${formLink}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Open & Fill Form</a></div>` : ''}
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Please complete the form before end of day.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, `Action Required: ${formName} — ${dueDate}`, html);
}

export async function sendFormOverdueEmail(to: string, fullName: string, formName: string, dueDate: string) {
  const html = wrap('Form Overdue', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Hi ${fullName},</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">The following form is now <strong>overdue</strong>:</p>
    <div style="margin:16px 0;padding:14px 18px;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:15px;color:#dc2626;font-weight:700;">${formName}</p>
      <p style="margin:0;font-size:13px;color:#dc2626;">Was due: ${dueDate}</p>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Please complete it as soon as possible.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— The DockForm Team</p>
  `);
  return send(to, `Overdue: ${formName}`, html);
}

export async function sendAdminNewSignupEmail(to: string, newUserName: string, newUserEmail: string) {
  const html = wrap('New Signup — Action Required', `
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">A new user has signed up on DockForm and is awaiting approval:</p>
    <div style="margin:16px 0;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <p style="margin:0 0 4px;font-size:14px;color:#111827;"><strong>Name:</strong> ${newUserName}</p>
      <p style="margin:0;font-size:14px;color:#111827;"><strong>Email:</strong> ${newUserEmail}</p>
    </div>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">Log in to DockForm Admin to review and approve this account.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">— DockForm System</p>
  `);
  return send(to, `New Signup: ${newUserName}`, html);
}
