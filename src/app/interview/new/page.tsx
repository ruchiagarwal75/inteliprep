import { Suspense } from "react";
import { PracticeSkeleton } from "@/components/practice-skeleton";
import { PracticePage } from "@/components/practice-page";
export const dynamic = "force-dynamic";
export default function NewInterview() {
  return (
    <Suspense fallback={<PracticeSkeleton view="brief" />}>
      <PracticePage view="brief" />
    </Suspense>
  );
}
