import { z } from "zod";
import {
  savedInterviewSchema,
  type SavedInterview,
} from "@/lib/saved-interview";

const markerSchema = z.object({
  kind: z.literal("latest-interview"),
  id: z.uuid(),
  problemId: z.string(),
  createdAt: z.iso.datetime(),
  deleted: z.boolean().optional(),
});
type Marker = z.infer<typeof markerSchema>;
/** Read every valid attempt and legacy deletion markers without mutating storage. */
export function readInterviewRecords(
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
    const savedMarkers = meta.getAll();
    savedMarkers.onsuccess = guard(() => {
      const previous = (savedMarkers.result as unknown[]).flatMap((value) => {
        const parsed = markerSchema.safeParse(value);
        return parsed.success ? [parsed.data] : [];
      });
      done(rows, new Map(previous.map((marker) => [marker.problemId, marker])));
    });
  });
}
