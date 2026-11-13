import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCareLoginForm } from "@/components/property-care/auth/PropertyCareLoginForm";

export const metadata: Metadata = {
  title: "Sign in | Ghar Safar Property Care",
  description: "Sign in to manage your maintenance requests, service visits and property care.",
};

export default function PropertyCareLoginPage() {
  return (
    <Suspense>
      <PropertyCareLoginForm />
    </Suspense>
  );
}
