import { BuyerAccessGuard } from "@/components/buyer/BuyerAccessGuard";
import { BuyerNavigation } from "@/components/buyer/BuyerNavigation";

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BuyerAccessGuard>
      <div className="buyer-shell min-h-screen bg-[#061326] text-slate-100">
        <BuyerNavigation />
        <main className="buyer-main mx-auto min-h-screen max-w-[1500px] px-4 pb-8 pt-20 sm:px-6 lg:ml-[212px] lg:px-7 lg:py-7">
          {children}
        </main>
      </div>
    </BuyerAccessGuard>
  );
}
