import { createApiClient } from './api-client';

type PresignResponse = {
  data: {
    presignedUrl: string;
    s3Key: string;
    expiresIn: number;
    templateMaxFileSizeMb: number;
  };
};

const FALLBACK_API_URL = 'http://localhost:8787/api';

export const validateFileByTemplate = (
  file: File,
  allowedExtensions: string[] | null,
  maxFileSizeMb: number,
): string | null => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (allowedExtensions?.length && (!extension || !allowedExtensions.includes(extension))) {
    return `許可されていない拡張子です: ${extension ?? 'unknown'}`;
  }

  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `ファイルサイズ上限 ${maxFileSizeMb}MB を超えています`;
  }

  return null;
};

export const presignUpload = async (params: {
  participationId: string;
  templateId: string;
  file: File;
  organizationId: string | null;
}): Promise<PresignResponse['data']> => {
  const client = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_URL,
    getOrganizationId: () => params.organizationId,
  });

  const response = await client.post<PresignResponse>('/upload/presign', {
    participationId: params.participationId,
    templateId: params.templateId,
    fileName: params.file.name,
    contentType: params.file.type || 'application/octet-stream',
  });

  return response.data;
};

export const putFileToSignedUrl = async (
  signedUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error('アップロードに失敗しました'));
    });

    xhr.addEventListener('error', () =>
      reject(new Error('アップロード中に通信エラーが発生しました')),
    );

    xhr.send(file);
  });
};
