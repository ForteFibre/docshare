'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

export const AuthBootstrap = () => {
  const { refresh } = useAuth();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return null;
};
