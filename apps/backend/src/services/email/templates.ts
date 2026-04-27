import type {
  EmailTemplateId,
  EmailTemplateMap,
  SendEmailContentParams,
  SendEmailParams,
  SendEmailTemplateParams,
} from './interface.js';

type EmailTemplateDefinition<TemplateId extends EmailTemplateId> = {
  render: (payload: EmailTemplateMap[TemplateId]) => Omit<SendEmailContentParams, 'to'>;
};

type EmailTemplateContent = {
  subject: string;
  heading: string;
  body: string[];
  action?: {
    label: string;
    href: string;
  };
  detail?: {
    label: string;
    value: string;
  };
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });

const renderParagraphs = (paragraphs: string[]): string =>
  paragraphs
    .map((paragraph) => `<p style="margin: 0 0 16px;">${escapeHtml(paragraph)}</p>`)
    .join('');

const renderEmail = (content: EmailTemplateContent): Omit<SendEmailContentParams, 'to'> => {
  const detailText = content.detail
    ? `${content.detail.label}: ${content.detail.value}`
    : undefined;
  const actionText = content.action ? `${content.action.label}: ${content.action.href}` : undefined;
  const text = [
    content.heading,
    '',
    ...content.body,
    ...(detailText ? ['', detailText] : []),
    ...(actionText ? ['', actionText] : []),
    '',
    'このメールに心当たりがない場合は、破棄してください。',
    '',
    'DocShare',
  ].join('\n');

  const detailHtml = content.detail
    ? `<div style="margin: 20px 0; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">${escapeHtml(content.detail.label)}</div>
        <div style="font-size: 16px; color: #0f172a; font-weight: 600; word-break: break-all;">${escapeHtml(content.detail.value)}</div>
      </div>`
    : '';
  const actionHtml = content.action
    ? `<div style="margin: 24px 0;">
        <a href="${escapeHtml(content.action.href)}" style="display: inline-block; padding: 12px 18px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${escapeHtml(content.action.label)}</a>
      </div>
      <p style="margin: 0 0 16px; color: #475569; font-size: 13px; word-break: break-all;">ボタンを開けない場合は、次のURLをブラウザに貼り付けてください。<br>${escapeHtml(content.action.href)}</p>`
    : '';

  return {
    subject: content.subject,
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.7;">
      <h1 style="font-size: 20px; line-height: 1.4; margin: 0 0 20px;">${escapeHtml(content.heading)}</h1>
      ${renderParagraphs(content.body)}
      ${detailHtml}
      ${actionHtml}
      <p style="margin: 24px 0 0; color: #475569; font-size: 13px;">このメールに心当たりがない場合は、破棄してください。</p>
      <p style="margin: 24px 0 0;">DocShare</p>
    </div>`,
    text,
  };
};

const emailTemplateDefinitions: {
  [TemplateId in EmailTemplateId]: EmailTemplateDefinition<TemplateId>;
} = {
  'organization-invitation': {
    render: (payload) =>
      renderEmail({
        subject: `${payload.organizationName} への招待`,
        heading: `${payload.organizationName} への招待`,
        body: [
          `${payload.inviterName} さんから、DocShare の ${payload.organizationName} に参加するための招待が届いています。`,
          '以下のリンクから参加手続きを完了してください。',
        ],
        action: {
          label: '招待を確認する',
          href: payload.inviteLink,
        },
      }),
  },
  'organization-member-invitation-link': {
    render: (payload) =>
      renderEmail({
        subject: `${payload.organizationName} への招待`,
        heading: `${payload.organizationName} への招待`,
        body: [
          `DocShare の ${payload.organizationName} にメンバーとして参加するための招待リンクをお送りします。`,
          '以下のリンクからアカウントの確認または登録を進めてください。',
        ],
        action: {
          label: 'メンバー招待を開く',
          href: payload.invitationLink,
        },
      }),
  },
  'university-owner-invitation-link': {
    render: (payload) =>
      renderEmail({
        subject: `${payload.universityName} の代表者招待`,
        heading: `${payload.universityName} の代表者招待`,
        body: [
          `DocShare で ${payload.universityName} の代表者アカウントを設定するための招待リンクをお送りします。`,
          `この申請は ${payload.requestedByEmail} のアカウントから送信されています。`,
          '以下のリンクは、このメールの受信先ではなく、申請元のアカウントで開いて代表者アカウントの設定を完了してください。',
        ],
        action: {
          label: '代表者設定を開く',
          href: payload.invitationLink,
        },
      }),
  },
  'participation-request-approved': {
    render: (payload) =>
      renderEmail({
        subject: `${payload.editionName} の大会追加申請が承認されました`,
        heading: '大会追加申請が承認されました',
        body: [
          `DocShare の ${payload.editionName} への参加申請が承認されました。`,
          `${payload.universityName}${
            payload.teamName ? ` (${payload.teamName})` : ''
          } として参加登録されています。`,
        ],
      }),
  },
  'email-verification': {
    render: (payload) =>
      renderEmail({
        subject: 'DocShare メールアドレスの確認',
        heading: 'メールアドレスの確認',
        body: [
          `${payload.userName} さん、DocShare への登録ありがとうございます。`,
          '以下のリンクからメールアドレスの確認を完了してください。',
        ],
        action: {
          label: 'メールアドレスを確認する',
          href: payload.verificationLink,
        },
      }),
  },
  'password-reset': {
    render: (payload) =>
      renderEmail({
        subject: 'DocShare パスワード再設定',
        heading: 'パスワード再設定',
        body: [
          `${payload.userName} さんの DocShare アカウントで、パスワード再設定がリクエストされました。`,
          '以下のリンクから新しいパスワードを設定してください。',
        ],
        action: {
          label: 'パスワードを再設定する',
          href: payload.resetLink,
        },
      }),
  },
};

export const resolveEmailTemplate = <TemplateId extends EmailTemplateId>(
  template: TemplateId,
  payload: EmailTemplateMap[TemplateId],
): Omit<SendEmailContentParams, 'to'> => emailTemplateDefinitions[template].render(payload);

const isTemplateEmail = (params: SendEmailParams): params is SendEmailTemplateParams =>
  'template' in params;

export const resolveSendEmailParams = (params: SendEmailParams): SendEmailContentParams => {
  if (!isTemplateEmail(params)) {
    return params;
  }

  return {
    to: params.to,
    text: params.text,
    ...resolveEmailTemplate(params.template, params.payload),
  };
};
