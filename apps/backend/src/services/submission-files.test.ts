import { describe, expect, it } from 'vitest';
import { validateUploadedFileReference } from './submission-files.js';

describe('uploaded file reference validation', () => {
  const baseParams = {
    template: { maxFileSizeMb: 5 },
    editionId: 'edition-1',
    participationId: 'participation-1',
    templateId: 'template-1',
    version: 2,
    s3Key:
      'submissions/edition-1/participation-1/template-1/v2_123e4567-e89b-12d3-a456-426614174000_slides.pdf',
    fileName: 'slides.pdf',
    fileSizeBytes: 1024,
    mimeType: 'application/pdf',
  } as const;

  it('accepts a matching key and object metadata', () => {
    const result = validateUploadedFileReference({
      ...baseParams,
      metadata: {
        contentLength: 1024,
        contentType: 'application/pdf',
      },
    });

    expect(result).toEqual({ ok: true });
  });

  it('rejects a key from another submission context', () => {
    const result = validateUploadedFileReference({
      ...baseParams,
      s3Key:
        'submissions/edition-1/participation-999/template-1/v2_123e4567-e89b-12d3-a456-426614174000_slides.pdf',
      metadata: {
        contentLength: 1024,
        contentType: 'application/pdf',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 's3Key is invalid for this submission context',
    });
  });

  it('rejects mismatched uploaded metadata', () => {
    const result = validateUploadedFileReference({
      ...baseParams,
      metadata: {
        contentLength: 2048,
        contentType: 'text/plain',
      },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Uploaded file size does not match payload',
    });
  });
});
