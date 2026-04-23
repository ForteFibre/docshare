import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../lib/config.js';

const createTransportMock = vi.fn(() => ({
  sendMail: vi.fn(),
}));
const setApiKeyMock = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: vi.fn(),
    setApiKey: setApiKeyMock,
  },
}));

const createEnv = (overrides: Partial<Env> = {}): Env => ({
  DATABASE_URL: 'postgres://robocon:password@localhost:5432/robocon',
  PORT: 8787,
  BETTER_AUTH_SECRET: 'dev-secret',
  BETTER_AUTH_URL: 'http://localhost:8787',
  APP_URL: 'http://localhost:3000',
  CORS_ALLOWED_ORIGINS: ['http://localhost:3000'],
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: 'minioadmin',
  S3_SECRET_KEY: 'minioadmin',
  S3_BUCKET_RULES: 'robocon-rules',
  S3_BUCKET_SUBMISSIONS: 'robocon-submissions',
  S3_FORCE_PATH_STYLE: true,
  EMAIL_PROVIDER: 'console',
  SENDGRID_API_KEY: undefined,
  SENDGRID_FROM: 'sendgrid@example.com',
  SMTP_HOST: undefined,
  SMTP_PORT: 587,
  SMTP_USER: undefined,
  SMTP_PASS: undefined,
  SMTP_FROM: undefined,
  SMTP_SECURE: false,
  SMTP_REQUIRE_TLS: false,
  ...overrides,
});

describe('createEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses console email by default', async () => {
    const { createEmailService } = await import('./index.js');
    const { ConsoleEmailService } = await import('./console.js');

    expect(createEmailService(createEnv())).toBeInstanceOf(ConsoleEmailService);
  });

  it('uses SendGrid when configured with an API key', async () => {
    const { createEmailService } = await import('./index.js');
    const { SendGridEmailService } = await import('./sendgrid.js');

    const service = createEmailService(
      createEnv({
        EMAIL_PROVIDER: 'sendgrid',
        SENDGRID_API_KEY: 'sendgrid-key',
      }),
    );

    expect(service).toBeInstanceOf(SendGridEmailService);
    expect(setApiKeyMock).toHaveBeenCalledWith('sendgrid-key');
  });

  it('keeps the existing SendGrid fallback when the API key is missing', async () => {
    const { createEmailService } = await import('./index.js');
    const { ConsoleEmailService } = await import('./console.js');

    expect(createEmailService(createEnv({ EMAIL_PROVIDER: 'sendgrid' }))).toBeInstanceOf(
      ConsoleEmailService,
    );
  });

  it('uses SMTP when all required SMTP settings are present', async () => {
    const { createEmailService } = await import('./index.js');
    const { SmtpEmailService } = await import('./smtp.js');

    const service = createEmailService(
      createEnv({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 465,
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        SMTP_FROM: 'from@example.com',
        SMTP_SECURE: true,
        SMTP_REQUIRE_TLS: true,
      }),
    );

    expect(service).toBeInstanceOf(SmtpEmailService);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
      requireTLS: true,
    });
  });

  it('throws when SMTP provider is missing required settings', async () => {
    const { createEmailService } = await import('./index.js');

    expect(() => createEmailService(createEnv({ EMAIL_PROVIDER: 'smtp' }))).toThrow(
      'EMAIL_PROVIDER=smtp requires SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM.',
    );
  });
});
