import { AuthBootstrap } from '@/components/auth-bootstrap';
import { AppHeader } from '@/components/header';
import { AuthProvider } from '@/lib/auth-context';
import type { ReactNode } from 'react';
import './globals.css';

type Props = {
  children: ReactNode;
};

export default function RootLayout({ children }: Props) {
  return (
    <html lang='ja'>
      <body>
        <AuthProvider>
          <AuthBootstrap />
          <AppHeader />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
