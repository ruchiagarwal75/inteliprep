import type { AdminVisitors } from "@/lib/admin-visitors";
import { AdminTime } from "@/components/admin-format";
export function AdminVisitorsPanel({ data }: { data: AdminVisitors }) {
  return (
    <section aria-label="New app visitors" className="rounded-lg border p-4">
      <h2 className="text-xl font-semibold">New app visitors (browsers)</h2>
      <div className="my-3 flex flex-wrap gap-8">
        <div>
          <p className="text-3xl font-semibold">{data.total}</p>
          <p className="text-sm">Recorded first visits in {data.environment}</p>
        </div>
        <div>
          <p className="text-3xl font-semibold">{data.newLast7Days}</p>
          <p className="text-sm">First visits in the last 7 days</p>
        </div>
      </div>
      <p className="text-sm">
        Tracking since <AdminTime value={data.trackingSince} />. Earlier visits
        are unavailable.
      </p>
      <p className="mt-2 text-sm">
        A browser is counted once, including before sign-in. Repeat visits do
        not add to the total. Clearing browser storage or using another browser
        can count again. Development visits and admin/test accounts follow the
        exclusion filter above.
      </p>
    </section>
  );
}
