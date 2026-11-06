import { z } from "zod";
import {
  savedInterviewSchema,
  type SavedInterview,
} from "@/lib/saved-interview";
import { latestInterviews } from "@/lib/latest-interview";

const markerSchema = z.object({
  kind: z.literal("latest-interview"),
  id: z.uuid(),
  problemId: z.string(),
  createdAt: z.iso.datetime(),
  deleted: z.boolean().optional(),
});
type Marker = z.infer<typeof markerSchema>;
export const latestInterviewKey = (problemId: string) => `latest:${problemId}`;
export function rememberLatestInterview(
  tx: IDBTransaction,
  saved: Pick<SavedInterview, "id" | "createdAt" | "interview">,
  deleted = false,
) {
  const marker: Marker = {
    kind: "latest-interview",
    id: saved.id,
    problemId: saved.interview.problemId,
    createdAt: saved.createdAt,
    deleted,
  };
  tx.objectStore("meta").put(marker, latestInterviewKey(marker.problemId));
}

/** Select latest history entries without erasing existing interview evidence. */
export function retainLatestInterviews(
  tx: IDBTransaction,
  done: (rows: SavedInterview[], markers: Map<string, Marker>) => void,
  fail: (error: Error) => void,
) {
  const store = tx.objectStore("interviews"),
    meta = tx.objectStore("meta");
  const guard = (callback: () => void) => () => {
    try {
      callback();
    } catch (cause) {
      fail(cause instanceof Error ? cause : new Error("Browser save failed"));
    }
  };
  const request = store.getAll();
  request.onsuccess = guard(() => {
    const rows: SavedInterview[] = (request.result as unknown[]).flatMap(
      (value) => {
        const parsed = savedInterviewSchema.safeParse(value);
        return parsed.success ? [parsed.data] : []; // Unknown/corrupt records are never erased.
      },
    );
    const identities: Marker[] = rows.map((row) => ({
      kind: "latest-interview",
      id: row.id,
      problemId: row.interview.problemId,
      createdAt: row.createdAt,
    }));
    const savedMarkers = meta.getAll();
    savedMarkers.onsuccess = guard(() => {
      const previous = (savedMarkers.result as unknown[]).flatMap((value) => {
        const parsed = markerSchema.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      });
      // Metadata wins equal identities, including a deleted attempt's tombstone.
      const markers = new Map(
        latestInterviews([...previous, ...identities]).map((marker) => [
          marker.problemId,
          marker,
        ]),
      );
      const retired = new Map<string, string | undefined>();
      const kept = rows.filter((row) => {
        const marker = markers.get(row.interview.problemId);
        if (marker?.id === row.id && !marker.deleted) return true;
        retired.set(row.id, marker && !marker.deleted ? marker.id : undefined);
        return false;
      });
      for (const marker of markers.values())
        if (
          !previous.some(
            (old) =>
              old.problemId === marker.problemId &&
              old.id === marker.id &&
              old.createdAt === marker.createdAt &&
              old.deleted === marker.deleted,
          )
        )
          meta.put(marker, latestInterviewKey(marker.problemId));
      const active = meta.get("active");
      active.onsuccess = guard(() => {
        const replacement = retired.get(active.result);
        if (replacement) meta.put(replacement, "active");
        else if (retired.has(active.result)) meta.delete("active");
        done(kept, markers);
      });
    });
  });
}
