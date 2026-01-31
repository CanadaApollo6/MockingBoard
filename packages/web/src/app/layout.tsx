import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth-provider';
import { Header } from '@/components/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'MockingBoard',
  description: 'Mock draft with your friends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
