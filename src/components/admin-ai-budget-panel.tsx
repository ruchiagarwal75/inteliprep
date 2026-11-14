import type { adminAiBudget } from "@/lib/admin-ai-budget";
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export function AdminAiBudgetPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof adminAiBudget>>;
}) {
  return (
    <section
      className="space-y-3 rounded border p-4"
      aria-label="Production AI budget"
    >
      <h2 className="text-xl font-semibold">Production AI budget</h2>
      <p>
        {data.day}, midnight to midnight UTC. Shared across all users, including
        admin and test calls.
      </p>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Estimated spend", value: data.spent },
          { label: "Reserved", value: data.held },
          { label: "Unknown usage reserve", value: data.uncertain },
          { label: "Available", value: data.remaining },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="text-xl font-semibold">{usd(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">
        Warning at {usd(data.warning)}, daily cap {usd(data.cap)}. New mocks
        reserve chat and feedback headroom. Missing usage stays reserved. These
        are conservative estimates, not the provider invoice.
      </p>
    </section>
  );
}
