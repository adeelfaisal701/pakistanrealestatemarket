import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertyCareRegisterForm } from "@/components/property-care/auth/PropertyCareRegisterForm";

export const metadata: Metadata = {
  title: "Create customer account | Ghar Safar Property Care",
  description: "Create a Ghar Safar Property Care customer account to book and track home maintenance.",
};

export default function PropertyCareRegisterPage() {
  return (
    <Suspense>
      <PropertyCareRegisterForm />
    </Suspense>
  );
}
