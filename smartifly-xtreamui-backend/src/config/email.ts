// src/config/email.ts
import nodemailer from "nodemailer";
import type { TransportOptions } from "nodemailer";

import { env } from "./env";

// --------------------------------------------------------
// SMTP TRANSPORTER (uses already-parsed values from env.ts)
// --------------------------------------------------------

const transportOptions = {
  host: env.smtpHost,
  port: env.smtpPort,       // number (from env.ts)
  secure: env.smtpSecure,   // boolean (from env.ts)
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
} as TransportOptions;

export const mailer = nodemailer.createTransport(transportOptions);

// Optional: simple helper to test email sending
export async function sendTestEmail(to: string) {
  return mailer.sendMail({
    from: `"Smartifly TV" <${env.smtpUser}>`,
    to,
    subject: "Test email from Smartifly backend",
    text: "Email system is working!",
  });
}
