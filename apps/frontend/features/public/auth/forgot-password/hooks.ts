import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { z } from 'zod';
import { authClient } from '@/lib/auth/client';

export function useForgotPasswordForm(onSuccess: (email: string) => void) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (result.error) {
        setError(result.error.message ?? 'パスワード再設定メールの送信に失敗しました');
        return;
      }

      onSuccess(value.email);
    },
  });

  return {
    form,
    error,
    validators: {
      email: z.string().email('有効なメールアドレスを入力してください'),
    },
  };
}
