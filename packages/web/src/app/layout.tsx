import type { Metadata } from 'next';
import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { AppShell } from '@/components/app-shell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'MockingBoard', template: '%s | MockingBoard' },
  description:
    'Community-powered NFL mock draft platform. Draft with friends, build big boards, write scouting reports, and track your accuracy.',
  openGraph: {
    type: 'website',
    siteName: 'MockingBoard',
    images: ['/logo.png'],
  },
  twitter: { card: 'summary' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} min-h-screen bg-background font-[family-name:var(--font-sans)] text-foreground antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
