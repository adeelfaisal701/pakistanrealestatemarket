import { HomepageFooter } from '@/components/marketplace/Footer';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <HomepageFooter showBackToTop />
      <GoogleAnalytics />
    </>
  );
}
