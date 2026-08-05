// Shared by server-side code only (the scheduled Kip email-alerts job, and
// eventually calendar-forward confirmations) — never exposed as its own
// routable Netlify Function, since an open send-email endpoint is a spam
// relay waiting to happen. Lives outside netlify/functions/ so Netlify's
// function bundler never turns it into an HTTP endpoint on its own.
//
// Uses real SMTP (via nodemailer), not ImprovMX's REST /emails/outbound
// endpoint. That endpoint is documented but confirmed via ImprovMX's own
// support chat to not actually be live yet, even on a Premium plan — every
// domain on the account returned an identical 404. SMTP is currently the
// only way to send through ImprovMX. See DECISIONS.md, "Email
// infrastructure (ImprovMX)" for the full trail of evidence.
import nodemailer from "nodemailer";

const SMTP_USER = process.env.IMPROVMX_SMTP_USER;
const SMTP_PASS = process.env.IMPROVMX_SMTP_PASS;

let transporter = null;
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error("ImprovMX SMTP is not configured (IMPROVMX_SMTP_USER / IMPROVMX_SMTP_PASS missing)");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.improvmx.com",
      port: 587,
      secure: false, // STARTTLS on 587, not implicit TLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendOutboundEmail({ to, subject, text, html }) {
  const info = await getTransporter().sendMail({ from: SMTP_USER, to, subject, text, html });
  return { id: info.messageId, accepted: info.accepted, rejected: info.rejected };
}
