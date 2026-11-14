import nodemailer, { Transporter } from 'nodemailer';
import config from '../config';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  const { host, port, secure, user, pass } = config.smtp;
  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
};

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; path: string; contentType?: string }[];
}

export const sendMail = async (opts: MailOptions): Promise<void> => {
  const t = getTransporter();
  await t.sendMail({
    from: config.smtp.from || config.smtp.user,
    ...opts,
  });
};
