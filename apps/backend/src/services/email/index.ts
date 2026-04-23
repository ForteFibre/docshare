import { type Env, env } from '../../lib/config.js';
import { ConsoleEmailService } from './console.js';
import type { EmailService } from './interface.js';
import { SendGridEmailService } from './sendgrid.js';
import { SmtpEmailService } from './smtp.js';

export const createEmailService = (config: Env): EmailService => {
  if (config.EMAIL_PROVIDER === 'sendgrid' && config.SENDGRID_API_KEY) {
    return new SendGridEmailService(config.SENDGRID_API_KEY, config.SENDGRID_FROM);
  }

  if (config.EMAIL_PROVIDER === 'smtp') {
    const smtpConfig = {
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
      from: config.SMTP_FROM,
      secure: config.SMTP_SECURE,
      requireTLS: config.SMTP_REQUIRE_TLS,
    };
    const missing = [
      ['SMTP_HOST', smtpConfig.host],
      ['SMTP_USER', smtpConfig.user],
      ['SMTP_PASS', smtpConfig.pass],
      ['SMTP_FROM', smtpConfig.from],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`EMAIL_PROVIDER=smtp requires ${missing.join(', ')}.`);
    }

    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass || !smtpConfig.from) {
      throw new Error('EMAIL_PROVIDER=smtp requires valid SMTP settings.');
    }

    return new SmtpEmailService({
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.user,
      pass: smtpConfig.pass,
      from: smtpConfig.from,
      secure: smtpConfig.secure,
      requireTLS: smtpConfig.requireTLS,
    });
  }

  return new ConsoleEmailService();
};

export const emailService: EmailService = createEmailService(env);
