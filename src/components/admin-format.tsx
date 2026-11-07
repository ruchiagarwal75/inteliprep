import type { CostSummary } from "@/lib/admin-records";
export function AdminTime({ value }: { value: string | null }) {
  if (!value || !Number.isFinite(Date.parse(value))) return <>Unavailable</>;
  return (
    <time dateTime={new Date(value).toISOString()}>
      {new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(value))}
    </time>
  );
}
export function AdminCost({ cost }: { cost: CostSummary }) {
  if (!cost.totalCalls) return <>No AI calls recorded</>;
  if (!cost.pricedCalls || cost.knownUsd === null)
    return <>Unavailable · {cost.totalCalls} calls without a cost estimate</>;
  return (
    <>
      ${Number(cost.knownUsd).toFixed(4)} estimated
      {cost.unknownCalls > 0 && (
        <> · partial: {cost.unknownCalls} calls unpriced</>
      )}
    </>
  );
}
