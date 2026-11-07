import { notFound } from "next/navigation";
import { MascotPreview } from "@/components/mascot-preview";

/** Temporary artwork review, available only on the local development server. */
export default function MascotPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MascotPreview />;
}
