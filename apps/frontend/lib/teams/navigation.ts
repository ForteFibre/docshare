export function buildTeamDetailHref(params: {
  editionId: string;
  participationId: string;
  templateId: string;
}): string {
  const basePath = `/editions/${params.editionId}/teams/${params.participationId}`;
  return `${basePath}?templateId=${encodeURIComponent(params.templateId)}`;
}

export function hasTemplateContext(templateId: string | null | undefined): boolean {
  return Boolean(templateId);
}
