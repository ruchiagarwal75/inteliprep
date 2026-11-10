import type { IpVisitorMetrics } from "@/lib/ip-visitor-tracking";
import { AdminTime } from "@/components/admin-format";

export function AdminIpVisitors({ data }: { data: IpVisitorMetrics }) {
  return (
    <section aria-label="IP address comparison" className="mt-5 border-t pt-4">
      <h3 className="font-semibold">Unique IP addresses (comparison)</h3>
      {data.status === "unavailable" ? (
        <p className="mt-2 text-sm">
          IP comparison unavailable. Check the Vercel configuration and IP
          tracking migration.
        </p>
      ) : (
        <>
          <div className="my-3 flex flex-wrap gap-8">
            <div>
              <p className="text-3xl font-semibold">{data.total}</p>
              <p className="text-sm">
                Unique IP addresses · all recorded visits
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold">{data.last7Days}</p>
              <p className="text-sm">IP addresses seen in the last 7 days</p>
            </div>
          </div>
          <p className="text-sm">
            {data.firstRecordedAt ? (
              <>
                First eligible IP record:{" "}
                <AdminTime value={data.firstRecordedAt} />.
              </>
            ) : (
              "No eligible IP visits recorded yet."
            )}{" "}
            Earlier visits cannot be backfilled.
          </p>
        </>
      )}
      <p className="mt-2 text-sm">
        IP addresses represent connections, not people. Several people can share
        an address, and one person can use several. Known automation and
        identifiable admin/test activity follow the reporting filters.
      </p>
    </section>
  );
}
