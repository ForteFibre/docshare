import { renderWithAuth } from '@/test/test-utils';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationSelector } from './organization-selector';

describe('OrganizationSelector', () => {
  it('選択変更時に状態更新コールバックが呼ばれる', () => {
    const onChanged = vi.fn();
    renderWithAuth(<OrganizationSelector onChanged={onChanged} />);

    fireEvent.change(screen.getByLabelText('organization-selector'), {
      target: { value: 'org-1' },
    });

    expect(onChanged).toHaveBeenCalledWith('org-1');
  });
});
