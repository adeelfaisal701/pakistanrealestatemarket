import PostPropertyPage from "./post-property-client";
import { buildMetadata, NOINDEX_FOLLOW } from "@/lib/seo/metadata";

/** Requires an agent sign-in (signed-out visitors are sent to /login), so it is not indexed. */
export const metadata = buildMetadata({
  title: "Post Your Property Free | Ghar Safar",
  description: "List your house, plot or apartment for sale or rent on Ghar Safar and reach serious buyers in Lahore.",
  path: "/post-property",
  robots: NOINDEX_FOLLOW,
});

export default function PostPropertyRoute() {
  return <PostPropertyPage />;
}
