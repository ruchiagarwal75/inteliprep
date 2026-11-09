import type { AdminVisitors } from "@/lib/admin-visitors";
import { AdminTime } from "@/components/admin-format";
export function AdminVisitorsPanel({ data }: { data: AdminVisitors }) {
  return (
    <section aria-label="App reach" className="rounded-lg border p-4">
      <h2 className="text-xl font-semibold">App reach</h2>
      <div className="my-3 flex flex-wrap gap-8">
        <div>
          <p className="text-3xl font-semibold">{data.identifiedAccounts}</p>
          <p className="text-sm">
            Identified signed-in accounts · all recorded visits in{" "}
            {data.environment}
          </p>
        </div>
        <div>
          <p className="text-3xl font-semibold">
            {data.identifiedAccountsLast7Days}
          </p>
          <p className="text-sm">
            Accounts with their first recorded visit in the last 7 days
          </p>
        </div>
      </div>
      <p className="text-sm">
        Tracking since <AdminTime value={data.trackingSince} />. Earlier visits
        are unavailable.
      </p>
      <p className="mt-2 text-sm">
        Accounts are identified from verified sign-in and counted once across
        browsers. Admin/test accounts follow the exclusion filter above.
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer underline">
          Unverified browser records
        </summary>
        <p className="mt-2 text-sm">
          {data.total} browser IDs recorded, including {data.anonymousBrowsers}{" "}
          anonymous IDs. {data.newLast7Days} first appeared in the last 7 days.
          These are not unique people. Historical records may include automated
          checks, signed-out testing and the same person in multiple browsers.
          They cannot be reliably converted into a count of people.
        </p>
      </details>
    </section>
  );
}
