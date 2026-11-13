import { OG_SIZE, brandShareImage } from "@/lib/seo/og-image";

export const alt = "Ghar Safar Property Care — home maintenance services in Lahore";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function MaintenanceOpengraphImage() {
  return brandShareImage({
    eyebrow: "Property Care",
    title: "Home Maintenance Services in Lahore",
    subtitle: "Verified technicians, upfront quotations and every job tracked to completion.",
    background: "linear-gradient(135deg, #0e3f8c 0%, #0b2c5f 55%, #081d40 100%)",
    accent: "#9fc3f5",
  });
}
