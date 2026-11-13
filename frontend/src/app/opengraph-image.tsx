import { OG_SIZE, brandShareImage } from "@/lib/seo/og-image";

export const alt = "Ghar Safar — Property for sale and rent in Lahore, Pakistan";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return brandShareImage({
    eyebrow: "Pakistan Real Estate",
    title: "Property for Sale & Rent in Lahore",
    subtitle: "Verified houses, plots, apartments and commercial property with trusted agents.",
    background: "linear-gradient(135deg, #0b2538 0%, #071b2b 60%, #04121d 100%)",
    accent: "#00b889",
  });
}
