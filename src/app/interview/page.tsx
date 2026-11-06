import { redirect } from "next/navigation";
import {
  interviewIdFromSearch,
  interviewHref,
} from "@/lib/interview-navigation";
export default async function LegacyInterview({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;
  const id = interviewIdFromSearch(
    new URLSearchParams({ session: session ?? "" }).toString(),
  );
  redirect(id ? interviewHref(id) : "/");
}
