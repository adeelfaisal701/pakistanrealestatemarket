import { Suspense } from "react";
import { BuyerInquiries } from "@/components/buyer/BuyerInquiries";

export const metadata = {
  title: "Buyer Inquiries | Ghar Safar",
};

export default function BuyerInquiriesPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center text-sm text-slate-500">Loading inquiries…</p>}>
      <BuyerInquiries />
    </Suspense>
  );
}
