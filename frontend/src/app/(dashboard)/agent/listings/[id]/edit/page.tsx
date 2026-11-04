"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AddPropertyForm } from "@/components/crm/AddPropertyForm";

export default function EditAgentListingPage() {
  const params = useParams<{ id: string }>();
  const propertyId = params.id;

  return (
    <div className="space-y-5">
      <Link
        href="/agent/listings"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my listings
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit property listing</h1>
        <p className="mt-1 text-sm text-slate-500">Saved photos and property features are loaded from your listing.</p>
      </header>
      <AddPropertyForm propertyId={propertyId} />
    </div>
  );
}
