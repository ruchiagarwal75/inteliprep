import { Suspense } from "react";
import { PracticeSkeleton } from "@/components/practice-skeleton";
import { PracticePage } from "@/components/practice-page";
export const dynamic = "force-dynamic";
export default function Home() {
  return (
    <Suspense fallback={<PracticeSkeleton view="home" />}>
      <PracticePage view="home" />
    </Suspense>
  );
}
