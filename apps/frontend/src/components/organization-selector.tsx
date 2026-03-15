'use client';

import { useAuth } from '@/lib/auth-context';

type Props = {
  onChanged?: (organizationId: string | null) => void;
};

export const OrganizationSelector = ({ onChanged }: Props) => {
  const { organizations, activeOrganizationId, setActiveOrganizationId } = useAuth();

  if (organizations.length === 0) {
    return <span>所属なし</span>;
  }

  return (
    <label>
      大学:
      <select
        aria-label='organization-selector'
        value={activeOrganizationId ?? ''}
        onChange={(event) => {
          const nextValue = event.currentTarget.value || null;
          setActiveOrganizationId(nextValue);
          onChanged?.(nextValue);
        }}
      >
        <option value=''>選択してください</option>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  );
};
