import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { Brand } from "@/components/brand";
import { adminPageAccess } from "@/lib/admin-page-access";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: `Private admin | ${BRAND.name}`,
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await adminPageAccess();
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <Brand small />
          <h1 className="mt-2 text-xl font-semibold">Private admin</h1>
          <p className="text-sm">Private · timestamps in UTC</p>
        </div>
        <nav className="flex gap-4">
          <Link className="underline" href="/admin">
            Overview
          </Link>
          <Link className="underline" href="/admin/access">
            Access
          </Link>
          <Link className="underline" href="/">
            Back to practice
          </Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
