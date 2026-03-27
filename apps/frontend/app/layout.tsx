import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { QueryProvider } from '@/lib/query/providers';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '製本企画',
  description: 'ロボコン出場チームがお互いに資料を共有し合うためのプラットフォーム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja' className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col'>
        <NuqsAdapter>
          <QueryProvider>
            <AuthProvider>
              <OrganizationProvider>
                {children}
                <Toaster />
              </OrganizationProvider>
            </AuthProvider>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
