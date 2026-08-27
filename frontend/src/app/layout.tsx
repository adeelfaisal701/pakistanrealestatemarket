import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PRM | Pakistan Real Estate Marketplace & Agent CRM (Lahore)',
  description:
    'Find fresh, 14-day verified houses, plots, and apartments in Lahore. Connect directly with owners and Level 2 verified agents with 1-tap WhatsApp.',
  keywords: [
    'Lahore Real Estate',
    'Pakistan Property',
    'DHA Lahore Houses',
    'Bahria Town Lahore Plots',
    'Johar Town Flats',
    'Agent CRM Pakistan',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
