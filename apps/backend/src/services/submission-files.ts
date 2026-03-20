import { matchesVersionedSubmissionKey } from './storage.js';
import { isContentTypeConsistent } from './submission-validation.js';

type FileTemplateLike = {
  maxFileSizeMb: number;
};

type UploadedObjectMetadata = {
  contentLength: number | null;
  contentType: string | null;
};

type ValidationResult = { ok: true } | { ok: false; error: string };

const normalizeMimeType = (value: string): string => {
  return value.split(';', 1)[0]?.trim().toLowerCase() ?? '';
};

export const validateUploadedFileReference = (params: {
  template: FileTemplateLike;
  metadata: UploadedObjectMetadata;
  editionId: string;
  participationId: string;
  templateId: string;
  version: number;
  s3Key: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}): ValidationResult => {
  if (
    !matchesVersionedSubmissionKey({
      key: params.s3Key,
      editionId: params.editionId,
      participationId: params.participationId,
      templateId: params.templateId,
      version: params.version,
      fileName: params.fileName,
    })
  ) {
    return { ok: false, error: 's3Key is invalid for this submission context' };
  }

  const maxFileSizeBytes = params.template.maxFileSizeMb * 1024 * 1024;
  if (params.fileSizeBytes > maxFileSizeBytes) {
    return { ok: false, error: 'File exceeds template max size' };
  }

  if (params.metadata.contentLength === null) {
    return { ok: false, error: 'Uploaded file metadata is unavailable' };
  }

  if (params.metadata.contentLength !== params.fileSizeBytes) {
    return { ok: false, error: 'Uploaded file size does not match payload' };
  }

  const normalizedPayloadMimeType = normalizeMimeType(params.mimeType);
  if (!isContentTypeConsistent(params.fileName, normalizedPayloadMimeType)) {
    return { ok: false, error: 'mimeType is inconsistent with file extension' };
  }

  if (!params.metadata.contentType) {
    return { ok: false, error: 'Uploaded file content type is unavailable' };
  }

  const normalizedObjectMimeType = normalizeMimeType(params.metadata.contentType);
  if (normalizedObjectMimeType !== normalizedPayloadMimeType) {
    return { ok: false, error: 'Uploaded file content type does not match payload' };
  }

  if (!isContentTypeConsistent(params.fileName, normalizedObjectMimeType)) {
    return { ok: false, error: 'Uploaded file content type is inconsistent with file extension' };
  }

  return { ok: true };
};
