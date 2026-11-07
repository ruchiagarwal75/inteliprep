import { Brand } from "@/components/brand";

export function PracticeSkeleton({
  view = "home",
}: {
  view?: "home" | "brief" | "interview" | "results";
}) {
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
