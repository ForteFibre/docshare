'use client';

import { ErrorPanel } from '@/components/error-panel';
import { RequireAuth } from '@/components/require-auth';
import { createAppApi } from '@/lib/api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import type { Submission, SubmissionTemplate } from '@/lib/types';
import { presignUpload, putFileToSignedUrl, validateFileByTemplate } from '@/lib/upload';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Props = {
  params: Promise<{ id: string }>;
};

const parseUrlPattern = (pattern: string): string[] => {
  return pattern
    .split(/[\s,]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
};

const validateUrlByPattern = (value: string, pattern: string | null): string | null => {
  if (!value.trim()) {
    return 'URLを入力してください。';
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return '有効なURL形式で入力してください。';
  }

  if (!pattern) {
    return null;
  }

  const trimmedPattern = pattern.trim();
  if (
    trimmedPattern.startsWith('/') &&
    trimmedPattern.endsWith('/') &&
    trimmedPattern.length >= 2
  ) {
    try {
      const regex = new RegExp(trimmedPattern.slice(1, -1), 'i');
      if (!regex.test(value)) {
        return `URL は ${pattern} に一致する必要があります。`;
      }
      return null;
    } catch {
      return 'URLバリデーション設定が不正です。管理者に連絡してください。';
    }
  }

  const candidates = parseUrlPattern(trimmedPattern);
  if (candidates.length === 0) {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const matched = candidates.some((candidate) => {
    return host === candidate || host.endsWith(`.${candidate}`);
  });

  if (!matched) {
    return `URL のドメインは ${pattern} のいずれかである必要があります。`;
  }

  return null;
};

export default function SubmitPage({ params }: Props) {
  const { activeOrganizationId } = useAuth();
  const api = useMemo(() => createAppApi(() => activeOrganizationId), [activeOrganizationId]);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SubmissionTemplate[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setEditionId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!editionId) {
      return;
    }
    try {
      setError(null);
      const [templateResponse, submissionResponse, participationResponse] = await Promise.all([
        api.getTemplates(editionId),
        api.getMySubmissions(editionId),
        api.getMyParticipation(editionId),
      ]);
      setTemplates(templateResponse.data);
      setSubmissions(submissionResponse.data);
      setParticipationId(participationResponse.data.id);
    } catch {
      setError('提出情報の取得に失敗しました。');
    }
  }, [api, editionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitFile = async (template: SubmissionTemplate, file: File) => {
    if (!editionId || !participationId) {
      return;
    }

    const validationError = validateFileByTemplate(
      file,
      template.allowedExtensions,
      template.maxFileSizeMb,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      setProgress(0);
      setActiveTemplateId(template.id);

      let presigned: {
        presignedUrl: string;
        s3Key: string;
      };
      try {
        presigned = await presignUpload({
          participationId,
          templateId: template.id,
          file,
          organizationId: activeOrganizationId,
        });
      } catch {
        setError('アップロード準備に失敗しました。時間をおいて再試行してください。');
        setProgress(null);
        return;
      }

      try {
        await putFileToSignedUrl(presigned.presignedUrl, file, setProgress);
      } catch {
        setError(
          'ファイルアップロードに失敗しました。ネットワーク状況を確認して再試行してください。',
        );
        setProgress(null);
        return;
      }

      const existing = submissions.find((item) => item.templateId === template.id);
      const payload = {
        templateId: template.id,
        participationId,
        s3Key: presigned.s3Key,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
      };

      if (existing) {
        await api.updateSubmission(existing.id, payload);
      } else {
        await api.createSubmission(payload);
      }

      await load();
      setProgress(100);
    } catch (errorValue) {
      if (errorValue instanceof ApiError) {
        setError(
          `提出登録に失敗しました（${errorValue.message}）。ファイルはアップロード済みの可能性があるため、再試行前に再読み込みで提出状況を確認してください。`,
        );
      } else {
        setError(
          '提出登録に失敗しました。ファイルはアップロード済みの可能性があるため、再試行前に再読み込みで提出状況を確認してください。',
        );
      }
      setProgress(null);
    } finally {
      setActiveTemplateId(null);
    }
  };

  const submitUrl = async (template: SubmissionTemplate, url: string) => {
    if (!participationId) {
      return;
    }

    const validationError = validateUrlByPattern(url, template.urlPattern);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError(null);
      setActiveTemplateId(template.id);
      const existing = submissions.find((item) => item.templateId === template.id);
      const payload = {
        templateId: template.id,
        participationId,
        url,
      };
      if (existing) {
        await api.updateSubmission(existing.id, payload);
      } else {
        await api.createSubmission(payload);
      }
      await load();
    } catch (errorValue) {
      if (errorValue instanceof ApiError) {
        setError(
          `URL提出に失敗しました（${errorValue.message}）。入力内容を確認して再試行してください。`,
        );
      } else {
        setError('URL提出に失敗しました。入力内容を確認して再試行してください。');
      }
    } finally {
      setActiveTemplateId(null);
    }
  };

  return (
    <RequireAuth>
      <section>
        <h1>資料提出</h1>
        {progress !== null ? <p>アップロード進捗: {progress}%</p> : null}
        {error ? <ErrorPanel message={error} onRetry={() => void load()} /> : null}
        <ul>
          {templates.map((template) => (
            <li key={template.id}>
              <h2>{template.name}</h2>
              <p>上限: {template.maxFileSizeMb}MB</p>
              {template.acceptType === 'file' ? (
                <input
                  aria-label={`file-${template.id}`}
                  type='file'
                  disabled={activeTemplateId === template.id}
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file) {
                      void submitFile(template, file);
                    }
                    event.currentTarget.value = '';
                  }}
                />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const url = String(formData.get('url') ?? '');
                    void submitUrl(template, url);
                  }}
                >
                  <input
                    name='url'
                    placeholder='https://example.com/video'
                    disabled={activeTemplateId === template.id}
                  />
                  <button type='submit' disabled={activeTemplateId === template.id}>
                    URL提出
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
