import { Brand } from "@/components/brand";

export function PracticeSkeleton({
  view = "home",
}: {
  view?: "home" | "brief" | "interview" | "results";
}) {
  if (view === "interview")
    return (
      <main
        className="interview-page interview-loading"
        role="status"
        aria-busy="true"
        aria-label="Loading your interview"
      >
        <span className="sr-only">Loading your interview</span>
        <div
          className="live-header grid grid-cols-[1fr_auto] items-center gap-2 min-[900px]:grid-cols-3"
          aria-hidden="true"
        >
          <div className="live-identity">
            <Brand />
            <div className="skeleton-live-title">
              <div className="skeleton-copy" />
              <div className="skeleton-copy" />
            </div>
          </div>
          <div className="order-3 col-span-2 min-[900px]:order-none min-[900px]:col-span-1">
            <div className="skeleton-copy" />
          </div>
          <div className="skeleton-copy" />
        </div>
        <div className="interview-loading-panels" aria-hidden="true">
          <div className="skeleton-board" />
          <div className="skeleton-chat">
            <div className="skeleton-copy" />
            <div className="skeleton-copy skeleton-copy-short" />
            <div className="skeleton-composer" />
          </div>
        </div>
      </main>
    );
  return (
    <main
      className={[
        "practice-loading",
        view === "home" || view === "brief" ? "practice-loading-entry" : "",
      ].join(" ")}
      role="status"
      aria-busy="true"
      aria-label="Loading your practice workspace"
    >
      <span className="sr-only">Loading your practice workspace</span>
      <div className="practice-loading-shell" aria-hidden="true">
        <Brand small />
        <div className="skeleton-title" />
        <div className="skeleton-copy" />
        <div className="skeleton-copy skeleton-copy-short" />
        <div className="skeleton-surface">
          {[0, 1, 2].map((i) => (
            <div className="skeleton-row" key={i}>
              <span />
              <span />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
