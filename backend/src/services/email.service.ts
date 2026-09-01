import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;
let usingRealSmtp = false;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD) {
    usingRealSmtp = true;
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
  } else {
    // Dev fallback: nodemailer's JSON transport doesn't send anything over
    // the network — it just formats the message, which we log. This means
    // password resets and staff welcome emails are visible in the server
    // console during local development without needing real SMTP
    // credentials. This is NOT a substitute for real email delivery in
    // production — set SMTP_HOST/PORT/USER/PASSWORD before deploying.
    usingRealSmtp = false;
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput): Promise<void> {
  const info = await getTransporter().sendMail({ from: env.SMTP_FROM, to, subject, text, html });

  if (!usingRealSmtp) {
    // eslint-disable-next-line no-console
    console.log('\n📧 [DEV EMAIL — not actually sent, SMTP not configured]');
    // eslint-disable-next-line no-console
    console.log(`   To: ${to}\n   Subject: ${subject}\n   ---\n${text}\n`);
  } else if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  }
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to,
    subject: 'Reset your Hospital RMS password',
    text: `We received a request to reset your password. This link expires in 30 minutes:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your password. This link expires in 30 minutes:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

export async function sendStaffWelcomeEmail(to: string, firstName: string, tempPassword: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your Hospital RMS account',
    text: `Hi ${firstName},\n\nAn account has been created for you on Hospital RMS.\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password as soon as possible at ${env.FRONTEND_URL}/login.`,
    html: `<p>Hi ${firstName},</p><p>An account has been created for you on Hospital RMS.</p><p>Email: ${to}<br/>Temporary password: <code>${tempPassword}</code></p><p>Please sign in and change your password as soon as possible at <a href="${env.FRONTEND_URL}/login">${env.FRONTEND_URL}/login</a>.</p>`,
  });
}
