import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewProvider } from "@/components/property-care/preview/PreviewShells";

/** UI PREVIEW ONLY — sample data, never available in production builds. */
export const metadata: Metadata = {
  title: "Property Care UI Preview (sample data)",
  robots: { index: false, follow: false },
};

export default function PropertyCarePreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewProvider>{children}</PreviewProvider>;
}
