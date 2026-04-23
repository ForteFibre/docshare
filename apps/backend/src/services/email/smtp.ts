import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import type { EmailService, SendEmailParams, SendEmailResult } from './interface.js';
import { resolveSendEmailParams } from './templates.js';

export type SmtpEmailServiceConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  requireTLS: boolean;
};

export class SmtpEmailService implements EmailService {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;

  constructor(private readonly config: SmtpEmailServiceConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      requireTLS: config.requireTLS,
    });
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const resolved = resolveSendEmailParams(params);
    const info = await this.transporter.sendMail({
      to: resolved.to,
      from: this.config.from,
      subject: resolved.subject,
      html: resolved.html,
      text: resolved.text,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  }
}
