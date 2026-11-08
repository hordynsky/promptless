import type { Metadata } from 'next';
import { Press_Start_2P, Space_Grotesk } from 'next/font/google';
import { APP_NAME, TAGLINE } from '@/data/league';
import './globals.css';

const px = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-press-start' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' });

export const metadata: Metadata = { title: APP_NAME, description: TAGLINE };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${px.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
