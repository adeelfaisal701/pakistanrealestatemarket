import { BuyerRequirementDetails } from "@/components/buyer/BuyerRequirementDetails";

export const metadata = {
  title: "Requirement Offers | EstatePro",
  description: "Review property offers submitted for your requirement.",
};

export default async function BuyerRequirementDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuyerRequirementDetails id={id} />;
}
