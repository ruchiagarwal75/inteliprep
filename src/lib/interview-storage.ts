import {
  savedInterviewSchema,
  savedInterviewSummary,
  type SavedInterview,
} from "@/lib/saved-interview";

const DATABASE = "inteliprep";
const SESSIONS = "interviews";
const META = "meta";

export class InterviewStorageConflict extends Error {
  constructor() {
    super(
      "This interview changed in another tab. Reopen it from Saved interviews before continuing.",
    );
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error(
          "Browser storage isn't available. Interviews won't survive a refresh.",
        ),
      );
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SESSIONS, { keyPath: "id" });
      request.result.createObjectStore(META);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error("Close other InteliPrep tabs to enable browser storage."),
      );
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (
    tx: IDBTransaction,
    done: (value: T) => void,
    fail: (error: Error) => void,
  ) => void,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction([SESSIONS, META], mode);
    let result: T;
    let failure: Error | null = null;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        failure ??
          tx.error ??
          new Error(
            "Browser save failed. Check your storage settings and free disk space.",
          ),
      );
    };
    try {
      run(
        tx,
        (value) => {
          result = value;
        },
        (error) => {
          failure = error;
          tx.abort();
        },
      );
    } catch (error) {
      failure =
        error instanceof Error ? error : new Error("Browser storage failed");
      tx.abort();
    }
  });
}

/** Resolves after transaction commit, not merely after the put request succeeds. */
export function saveInterview(
  saved: SavedInterview,
  expectedRevision?: string,
) {
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
        fail(cause instanceof Error ? cause : new Error("Browser save failed"));
      }
    };
  });
}

export function readInterview(id: string) {
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

export function listInterviews() {
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
              return parsed.success ? [savedInterviewSummary(parsed.data)] : [];
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

export function activeInterviewId() {
  return transaction<string | undefined>("readonly", (tx, done) => {
    const request = tx.objectStore(META).get("active");
    request.onsuccess = () =>
      done(typeof request.result === "string" ? request.result : undefined);
  });
}

export function selectInterview(id?: string) {
  return transaction<void>("readwrite", (tx, done) => {
    if (id) tx.objectStore(META).put(id, "active");
    else tx.objectStore(META).delete("active");
    done(undefined);
  });
}

export function deleteInterview(id: string) {
  return transaction<void>("readwrite", (tx, done) => {
    tx.objectStore(SESSIONS).delete(id);
    const request = tx.objectStore(META).get("active");
    request.onsuccess = () => {
      if (request.result === id) tx.objectStore(META).delete("active");
      done(undefined);
    };
  });
}
