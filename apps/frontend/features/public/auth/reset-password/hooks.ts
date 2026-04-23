import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '@/lib/auth/client';

export function useResetPasswordForm(token: string | null, onSuccess: () => void) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!token) {
        setError('再設定リンクが無効です');
        return;
      }

      const result = await authClient.resetPassword({
        newPassword: value.password,
        token,
      });

      if (result.error) {
        setError(result.error.message ?? 'パスワードの再設定に失敗しました');
        return;
      }

      onSuccess();
    },
  });

  return {
    form,
    error,
    validators: {
      password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
      confirmPassword: ({ value, password }: { value: string; password: string }) => {
        if (value !== password) {
          return { message: 'パスワードが一致しません' };
        }

        return undefined;
      },
    },
  };
}
