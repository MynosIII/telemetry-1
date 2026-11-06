import { notFound } from "next/navigation";

// Any address that no page claims ends in the site's own 404 page.
export default function UnknownPage() {
  notFound();
}
