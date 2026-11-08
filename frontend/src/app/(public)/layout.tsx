import { HomepageFooter } from '@/components/marketplace/Footer';

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <HomepageFooter showBackToTop />
    </>
  );
}
