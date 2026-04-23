import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn();
const createTransportMock = vi.fn(() => ({
  sendMail: sendMailMock,
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

describe('SmtpEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({
      messageId: 'smtp-message-1',
    });
  });

  it('creates a transporter with SMTP settings', async () => {
    const { SmtpEmailService } = await import('./smtp.js');

    new SmtpEmailService({
      host: 'smtp.example.com',
      port: 465,
      user: 'smtp-user',
      pass: 'smtp-pass',
      from: 'from@example.com',
      secure: true,
      requireTLS: true,
    });

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

  it('sends raw subject/html emails as-is', async () => {
    const { SmtpEmailService } = await import('./smtp.js');
    const service = new SmtpEmailService({
      host: 'smtp.example.com',
      port: 587,
      user: 'smtp-user',
      pass: 'smtp-pass',
      from: 'from@example.com',
      secure: false,
      requireTLS: false,
    });

    const result = await service.sendEmail({
      to: 'owner@example.com',
      subject: 'Hello',
      html: '<p>World</p>',
      text: 'World',
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      from: 'from@example.com',
      subject: 'Hello',
      html: '<p>World</p>',
      text: 'World',
    });
    expect(result).toEqual({
      success: true,
      messageId: 'smtp-message-1',
    });
  });

  it('resolves template-based emails before sending', async () => {
    const { SmtpEmailService } = await import('./smtp.js');
    const service = new SmtpEmailService({
      host: 'smtp.example.com',
      port: 587,
      user: 'smtp-user',
      pass: 'smtp-pass',
      from: 'from@example.com',
      secure: false,
      requireTLS: true,
    });

    await service.sendEmail({
      to: 'owner@example.com',
      template: 'university-owner-invitation-link',
      payload: {
        universityName: 'Approve University',
        invitationLink: 'https://app.example.test/invite/invite-1',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith({
      to: 'owner@example.com',
      from: 'from@example.com',
      subject: 'Approve University の代表者招待',
      html: expect.stringContaining('https://app.example.test/invite/invite-1'),
      text: expect.stringContaining('代表者設定を開く: https://app.example.test/invite/invite-1'),
    });
  });
});
