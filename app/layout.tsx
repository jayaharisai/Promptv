import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import React from 'react';

import { ThemeLoader } from '../components/theme-loader';
import '../styles.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Promptv',
  description: 'Frontend foundation for Promptv.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body><ThemeLoader />{children}</body>
    </html>
  );
}
