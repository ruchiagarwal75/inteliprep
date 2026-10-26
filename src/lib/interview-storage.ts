import {
  savedInterviewSchema,
  savedInterviewSummary,
  type SavedInterview,
} from "@/lib/saved-interview";

import { createInterviewDatabase } from "@/lib/interview-database";

const SESSIONS = "interviews";
const META = "meta";

export class InterviewStorageConflict extends Error {
  constructor() {
    super(
      "This interview changed in another tab. Reopen it from Saved interviews before continuing.",
    );
  }
}

/** Each immutable storage instance belongs to one verified account. */
export function createInterviewStorage(userId: string) {
  const { transaction, deactivate } = createInterviewDatabase(userId);
  /** Resolves after transaction commit, not merely after the put request succeeds. */
  function saveInterview(saved: SavedInterview, expectedRevision?: string) {
    return transaction<void>("readwrite", (tx, done, fail) => {
      const store = tx.objectStore(SESSIONS);
      const request = store.get(saved.id);
      request.onsuccess = () => {
        try {
          const current = savedInterviewSchema.safeParse(request.result);
          if (
            expectedRevision &&
            (!current.success || current.data.revision !== expectedRevision)
          ) {
            fail(new InterviewStorageConflict());
            return;
          }
          store.put(savedInterviewSchema.parse(saved));
          tx.objectStore(META).put(saved.id, "active");
          done(undefined);
        } catch (cause) {
          fail(
            cause instanceof Error ? cause : new Error("Browser save failed"),
          );
        }
      };
    });
  }

  function readInterview(id: string) {
    return transaction<SavedInterview | undefined>(
      "readonly",
      (tx, done, fail) => {
        const request = tx.objectStore(SESSIONS).get(id);
        request.onsuccess = () => {
          if (request.result === undefined) {
            done(undefined);
            return;
          }
          const parsed = savedInterviewSchema.safeParse(request.result);
          if (!parsed.success) {
            fail(
              new Error(
                "This saved interview couldn't be read. Its browser copy has been retained.",
              ),
            );
            return;
          }
          done(parsed.data);
        };
      },
    );
  }

  function listInterviews() {
    return transaction<ReturnType<typeof savedInterviewSummary>[]>(
      "readonly",
      (tx, done) => {
        const request = tx.objectStore(SESSIONS).getAll();
        request.onsuccess = () => {
          const rows: unknown[] = request.result;
          done(
            rows
              .flatMap((row) => {
                const parsed = savedInterviewSchema.safeParse(row);
                return parsed.success
                  ? [savedInterviewSummary(parsed.data)]
                  : [];
              })
              .sort(
                (a, b) =>
                  Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
                  a.id.localeCompare(b.id),
              ),
          );
        };
      },
    );
  }

  function activeInterviewId() {
    return transaction<string | undefined>("readonly", (tx, done) => {
      const request = tx.objectStore(META).get("active");
      request.onsuccess = () =>
        done(typeof request.result === "string" ? request.result : undefined);
    });
  }

  function selectInterview(id?: string) {
    return transaction<void>("readwrite", (tx, done) => {
      if (id) tx.objectStore(META).put(id, "active");
      else tx.objectStore(META).delete("active");
      done(undefined);
    });
  }

  function deleteInterview(id: string) {
    return transaction<void>("readwrite", (tx, done) => {
      tx.objectStore(SESSIONS).delete(id);
      const request = tx.objectStore(META).get("active");
      request.onsuccess = () => {
        if (request.result === id) tx.objectStore(META).delete("active");
        done(undefined);
      };
    });
  }

  return {
    saveInterview,
    readInterview,
    listInterviews,
    activeInterviewId,
    selectInterview,
    deleteInterview,
    deactivate,
  };
}
export type InterviewStorage = ReturnType<typeof createInterviewStorage>;
