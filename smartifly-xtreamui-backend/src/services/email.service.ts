import { mailer } from "../config/email";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  return mailer.sendMail({
    from: '"Godfather IPTV" <no-reply@godfatheriptv.com>',
    to,
    subject,
    html,
  });
}
